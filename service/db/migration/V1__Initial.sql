CREATE TABLE server
(
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    port       INT          NOT NULL,
    status     VARCHAR(50)  NOT NULL,
    ip_address VARCHAR(45)  NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);