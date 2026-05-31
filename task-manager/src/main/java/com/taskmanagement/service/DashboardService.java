package com.taskmanagement.service;

import com.taskmanagement.dto.response.DashboardStatsDTO;
import com.taskmanagement.dto.response.MemberStatDTO;
import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.User;
import com.taskmanagement.repository.TaskRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final TaskRepo taskRepository;
    private final ActivityLogService activityLogService;

    public DashboardStatsDTO getStats() {
        List<Task> active = taskRepository.findAll().stream()
                .filter(t -> !t.isDeleted())
                .toList();
        LocalDate today = LocalDate.now();

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (Task.TaskStatus s : Task.TaskStatus.values()) {
            byStatus.put(s.name(), 0L);
        }
        Map<String, Long> byPriority = new LinkedHashMap<>();
        for (Task.TaskPriority p : Task.TaskPriority.values()) {
            byPriority.put(p.name(), 0L);
        }

        long overdue = 0;
        long dueToday = 0;
        long done = 0;

        Map<Integer, MemberAccumulator> memberStats = new LinkedHashMap<>();

        for (Task task : active) {
            byStatus.merge(task.getStatus().name(), 1L, Long::sum);
            byPriority.merge(task.getPriority().name(), 1L, Long::sum);

            boolean isDone = task.getStatus() == Task.TaskStatus.DONE;
            if (isDone) {
                done++;
            }
            if (task.getDueDate() != null) {
                if (!isDone && task.getDueDate().isBefore(today)) {
                    overdue++;
                }
                if (task.getDueDate().isEqual(today) && !isDone) {
                    dueToday++;
                }
            }

            task.getTaskAssignments().forEach(assignment -> {
                User u = assignment.getUser();
                if (u == null) {
                    return;
                }
                MemberAccumulator acc = memberStats.computeIfAbsent(u.getUserId(),
                        k -> new MemberAccumulator(u.getUserId(), u.getFullName()));
                acc.taskCount++;
                if (task.getStatus() == Task.TaskStatus.DONE) {
                    acc.doneCount++;
                }
            });
        }

        int total = active.size();
        double completionRate = total == 0 ? 0.0 : Math.round((double) done / total * 100.0) / 100.0;

        List<MemberStatDTO> tasksByMember = memberStats.values().stream()
                .map(a -> MemberStatDTO.builder()
                        .userId(a.userId)
                        .fullName(a.fullName)
                        .taskCount(a.taskCount)
                        .doneCount(a.doneCount)
                        .build())
                .sorted(Comparator.comparingLong(MemberStatDTO::getTaskCount).reversed())
                .toList();

        return DashboardStatsDTO.builder()
                .tasksByStatus(byStatus)
                .tasksByPriority(byPriority)
                .overdueCount(overdue)
                .dueTodayCount(dueToday)
                .completionRate(completionRate)
                .tasksByMember(tasksByMember)
                .recentActivity(activityLogService.getRecentActivities(10))
                .build();
    }

    private static final class MemberAccumulator {
        final Integer userId;
        final String fullName;
        long taskCount;
        long doneCount;

        MemberAccumulator(Integer userId, String fullName) {
            this.userId = userId;
            this.fullName = fullName;
        }
    }
}
