package com.taskmanagement.config;

import org.springframework.stereotype.Component;

import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * Simple in-memory sliding-window rate limiter for the login endpoint:
 * max 5 attempts per IP per minute. No external dependency required.
 */
@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_MS = 60_000L;

    private final ConcurrentHashMap<String, Deque<Long>> attempts = new ConcurrentHashMap<>();

    /** Records an attempt for the given key and returns true if it is allowed. */
    public boolean tryAcquire(String key) {
        long now = System.currentTimeMillis();
        Deque<Long> deque = attempts.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());
        synchronized (deque) {
            while (!deque.isEmpty() && now - deque.peekFirst() > WINDOW_MS) {
                deque.pollFirst();
            }
            if (deque.size() >= MAX_ATTEMPTS) {
                return false;
            }
            deque.addLast(now);
            return true;
        }
    }
}
