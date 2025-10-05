INSERT INTO users (id, email, password_hash, name, role)
VALUES
(gen_random_uuid(), 'admin@example.com', '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'Admin', 'admin'),
(gen_random_uuid(), 'agent@example.com', '$2a$10$yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy', 'Agent', 'agent'),
(gen_random_uuid(), 'user@example.com', '$2a$10$zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', 'User', 'user');
