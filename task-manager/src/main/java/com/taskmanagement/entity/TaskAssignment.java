package com.taskmanagement.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "task_assignments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TaskAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "assignment_id")
    private Integer assignmentId;

    @ManyToOne
    @JoinColumn(name = "task_id", nullable = false)
    @JsonIgnore
    private Task task;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt = LocalDateTime.now();

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TaskAssignment other)) return false;
        if (task == null || user == null || other.task == null || other.user == null) return false;
        return Objects.equals(task.getTaskId(), other.task.getTaskId())
            && Objects.equals(user.getUserId(), other.user.getUserId());
    }

    @Override
    public int hashCode() {
        return Objects.hash(
            task != null ? task.getTaskId() : null,
            user != null ? user.getUserId() : null
        );
    }
}
