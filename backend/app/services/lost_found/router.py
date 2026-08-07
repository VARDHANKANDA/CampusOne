"""Lost & Found — docs/API.md §10, docs/PRD.md FR-8.x."""

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import ForbiddenError, NotFoundError
from app.core.security import CurrentUser, get_current_user, require_role
from app.core.storage import upload_image
from app.models.lost_found import LostFoundItem, LostFoundStatus, LostFoundType
from app.models.user import Role
from app.services.audit.service import record_audit_log
from app.services.lost_found.schemas import LostFoundOut, LostFoundStatusUpdate

router = APIRouter(prefix="/lost-found", tags=["lost-found"])


@router.post("", response_model=LostFoundOut, status_code=status.HTTP_201_CREATED)
async def report_item(
    background_tasks: BackgroundTasks,
    item_type: LostFoundType = Form(..., alias="type"),
    description: str = Form(..., min_length=1, max_length=2000),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.STUDENT)),
) -> LostFoundItem:
    image_url = None
    if image is not None:
        image_url = await upload_image("lost-found-images", image, prefix=f"{current_user.id}/")

    item = LostFoundItem(
        reporter_id=current_user.id,
        type=item_type,
        description=description,
        image_url=image_url,
        status=LostFoundStatus.OPEN,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "lost_found_item.created",
        "lost_found_item",
        item.id,
        after_state=LostFoundOut.model_validate(item).model_dump(mode="json"),
    )
    return item


@router.get("", response_model=list[LostFoundOut])
def search_items(
    item_type: LostFoundType | None = None,
    status_filter: LostFoundStatus | None = None,
    keyword: str | None = None,
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(get_current_user),
) -> list[LostFoundItem]:
    query = select(LostFoundItem)
    if item_type is not None:
        query = query.where(LostFoundItem.type == item_type)
    if status_filter is not None:
        query = query.where(LostFoundItem.status == status_filter)
    if keyword:
        query = query.where(LostFoundItem.description.ilike(f"%{keyword}%"))
    return list(db.execute(query.order_by(LostFoundItem.created_at.desc())).scalars().all())


@router.patch("/{item_id}/status", response_model=LostFoundOut)
def update_item_status(
    item_id: UUID,
    payload: LostFoundStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> LostFoundItem:
    item = db.get(LostFoundItem, item_id)
    if item is None:
        raise NotFoundError("Lost & Found item not found")
    if current_user.role != Role.ADMIN and item.reporter_id != current_user.id:
        raise ForbiddenError("Only the reporter or an admin can update this item's status.")

    before = LostFoundOut.model_validate(item).model_dump(mode="json")
    item.status = LostFoundStatus(payload.status)
    db.commit()
    db.refresh(item)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "lost_found_item.status_updated",
        "lost_found_item",
        item.id,
        before_state=before,
        after_state=LostFoundOut.model_validate(item).model_dump(mode="json"),
    )
    return item
