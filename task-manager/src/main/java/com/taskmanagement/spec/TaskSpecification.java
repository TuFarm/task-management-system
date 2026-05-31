package com.taskmanagement.spec;

import com.taskmanagement.dto.request.TaskSearchCriteria;
import com.taskmanagement.entity.Task;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Builds a dynamic {@link Specification} for {@link Task} from {@link TaskSearchCriteria}. */
public final class TaskSpecification {

    private TaskSpecification() {
    }

    public static Specification<Task> build(TaskSearchCriteria c, LocalDate today) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Only active (non-deleted) tasks
            predicates.add(cb.isFalse(root.get("isDeleted")));

            if (hasText(c.getKeyword())) {
                String like = "%" + c.getKeyword().toLowerCase().trim() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(root.get("description")), like)));
            }

            if (hasText(c.getStatus())) {
                predicates.add(cb.equal(root.get("status"),
                        Task.TaskStatus.valueOf(c.getStatus().toUpperCase())));
            }

            if (hasText(c.getPriority())) {
                predicates.add(cb.equal(root.get("priority"),
                        Task.TaskPriority.valueOf(c.getPriority().toUpperCase())));
            }

            if (c.getCategoryId() != null) {
                predicates.add(cb.equal(root.get("category").get("categoryId"), c.getCategoryId()));
            }

            if (c.getCreatedBy() != null) {
                predicates.add(cb.equal(root.get("createdBy").get("userId"), c.getCreatedBy()));
            }

            if (c.getDueDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dueDate"), c.getDueDateFrom()));
            }

            if (c.getDueDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dueDate"), c.getDueDateTo()));
            }

            if (c.getAssigneeId() != null) {
                Join<Object, Object> assignments = root.join("taskAssignments");
                predicates.add(cb.equal(assignments.get("user").get("userId"), c.getAssigneeId()));
                if (query != null) {
                    query.distinct(true);
                }
            }

            if (c.getIsOverdue() != null) {
                Predicate overdue = cb.and(
                        cb.lessThan(root.get("dueDate"), today),
                        cb.notEqual(root.get("status"), Task.TaskStatus.DONE));
                predicates.add(c.getIsOverdue() ? overdue : cb.not(overdue));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static boolean hasText(String s) {
        return s != null && !s.trim().isEmpty();
    }
}
