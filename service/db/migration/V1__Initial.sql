CREATE TABLE server
(
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    ip_address INET         NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);