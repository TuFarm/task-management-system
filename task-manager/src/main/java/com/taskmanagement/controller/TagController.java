package com.taskmanagement.controller;

import com.taskmanagement.dto.request.TagRequest;
import com.taskmanagement.dto.response.TagDTO;
import com.taskmanagement.service.TagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tags")
@RequiredArgsConstructor
@Tag(name = "Tags", description = "Manage task tags")
public class TagController {

    private final TagService tagService;

    @Operation(summary = "List all tags")
    @GetMapping
    public List<TagDTO> getAll() {
        return tagService.getAll();
    }

    @Operation(summary = "Create a tag")
    @PostMapping
    public ResponseEntity<TagDTO> create(@Valid @RequestBody TagRequest request) {
        return ResponseEntity.ok(tagService.create(request));
    }

    @Operation(summary = "Delete a tag")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        tagService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
