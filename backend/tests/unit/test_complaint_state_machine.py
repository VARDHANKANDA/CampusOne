"""Per docs/TESTING.md §2.1: state-transition validators are critical-path logic."""

import pytest

from app.models.complaint import VALID_COMPLAINT_TRANSITIONS, ComplaintStatus


@pytest.mark.parametrize(
    ("current", "target"),
    [
        (ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED),
        (ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS),
        (ComplaintStatus.IN_PROGRESS, ComplaintStatus.COMPLETED),
        (ComplaintStatus.COMPLETED, ComplaintStatus.VERIFIED),
    ],
)
def test_valid_transitions_allowed(current: ComplaintStatus, target: ComplaintStatus) -> None:
    assert target in VALID_COMPLAINT_TRANSITIONS[current]


@pytest.mark.parametrize(
    ("current", "target"),
    [
        (ComplaintStatus.SUBMITTED, ComplaintStatus.VERIFIED),
        (ComplaintStatus.SUBMITTED, ComplaintStatus.IN_PROGRESS),
        (ComplaintStatus.ASSIGNED, ComplaintStatus.COMPLETED),
        (ComplaintStatus.VERIFIED, ComplaintStatus.SUBMITTED),
        (ComplaintStatus.COMPLETED, ComplaintStatus.ASSIGNED),
    ],
)
def test_invalid_transitions_rejected(current: ComplaintStatus, target: ComplaintStatus) -> None:
    assert target not in VALID_COMPLAINT_TRANSITIONS[current]


def test_verified_is_terminal() -> None:
    assert VALID_COMPLAINT_TRANSITIONS[ComplaintStatus.VERIFIED] == set()
