package com.taskmanagement.service;

import com.taskmanagement.dto.request.TaskSearchCriteria;
import com.taskmanagement.dto.response.TaskSimpleDTO;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CsvExportService {

    private final TaskService taskService;

    public byte[] exportTasks(TaskSearchCriteria criteria) {
        List<TaskSimpleDTO> tasks = taskService.searchAll(criteria);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        // UTF-8 BOM so Excel renders Vietnamese characters correctly
        out.write(0xEF);
        out.write(0xBB);
        out.write(0xBF);

        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader("Task ID", "Title", "Status", "Priority", "Category",
                        "Assignees", "Due Date", "Created By", "Created At")
                .build();

        try (Writer writer = new OutputStreamWriter(out, StandardCharsets.UTF_8);
             CSVPrinter printer = new CSVPrinter(writer, format)) {
            for (TaskSimpleDTO t : tasks) {
                printer.printRecord(
                        t.getTaskId(),
                        t.getTitle(),
                        t.getStatus(),
                        t.getPriority(),
                        t.getCategoryName() == null ? "" : t.getCategoryName(),
                        t.getAssigneeNames() == null ? "" : String.join("; ", t.getAssigneeNames()),
                        t.getDueDate() == null ? "" : t.getDueDate().toString(),
                        t.getCreatedByUsername() == null ? "" : t.getCreatedByUsername(),
                        t.getCreatedAt() == null ? "" : t.getCreatedAt().toString());
            }
            printer.flush();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to generate CSV: " + e.getMessage());
        }
        return out.toByteArray();
    }
}
