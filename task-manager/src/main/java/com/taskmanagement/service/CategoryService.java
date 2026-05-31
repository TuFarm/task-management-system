package com.taskmanagement.service;

import com.taskmanagement.dto.request.CategoryRequest;
import com.taskmanagement.dto.response.CategoryDTO;
import com.taskmanagement.entity.Category;
import com.taskmanagement.exception.ResourceNotFoundException;
import com.taskmanagement.repository.CategoryRepo;
import com.taskmanagement.repository.TaskRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class CategoryService {

    private final CategoryRepo categoryRepository;
    private final TaskRepo taskRepository;

    public List<CategoryDTO> getAll() {
        return categoryRepository.findAll().stream().map(this::toDTO).toList();
    }

    @Transactional
    public CategoryDTO create(CategoryRequest request) {
        Category category = new Category();
        category.setName(request.getName());
        category.setColor(request.getColor());
        return toDTO(categoryRepository.save(category));
    }

    @Transactional
    public CategoryDTO update(Integer id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
        category.setName(request.getName());
        category.setColor(request.getColor());
        return toDTO(categoryRepository.save(category));
    }

    @Transactional
    public void delete(Integer id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
        long taskCount = taskRepository.countByCategory_CategoryId(id);
        if (taskCount > 0) {
            throw new IllegalStateException(
                    "Cannot delete category '" + category.getName() + "': " + taskCount + " task(s) still use it");
        }
        categoryRepository.delete(category);
        log.info("Category deleted: {}", category.getName());
    }

    private CategoryDTO toDTO(Category c) {
        return CategoryDTO.builder()
                .categoryId(c.getCategoryId())
                .name(c.getName())
                .color(c.getColor())
                .taskCount(taskRepository.countByCategory_CategoryId(c.getCategoryId()))
                .build();
    }
}
