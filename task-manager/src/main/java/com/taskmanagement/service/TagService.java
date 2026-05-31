package com.taskmanagement.service;

import com.taskmanagement.dto.request.TagRequest;
import com.taskmanagement.dto.response.TagDTO;
import com.taskmanagement.entity.Tag;
import com.taskmanagement.exception.ResourceNotFoundException;
import com.taskmanagement.repository.TagRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class TagService {

    private final TagRepo tagRepository;

    public List<TagDTO> getAll() {
        return tagRepository.findAll().stream().map(this::toDTO).toList();
    }

    @Transactional
    public TagDTO create(TagRequest request) {
        if (tagRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Tag already exists: " + request.getName());
        }
        Tag tag = new Tag();
        tag.setName(request.getName());
        tag.setColor(request.getColor());
        return toDTO(tagRepository.save(tag));
    }

    @Transactional
    public void delete(Integer id) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tag not found: " + id));
        tagRepository.delete(tag);
        log.info("Tag deleted: {}", tag.getName());
    }

    private TagDTO toDTO(Tag t) {
        return TagDTO.builder()
                .tagId(t.getTagId())
                .name(t.getName())
                .color(t.getColor())
                .build();
    }
}
