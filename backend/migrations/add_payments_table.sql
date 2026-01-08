CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    yookassa_payment_id VARCHAR(100) UNIQUE NOT NULL,
    amount INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    description VARCHAR(200),
    tariff_type VARCHAR(50),
    order_data TEXT, -- JSON string with order details
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_yookassa_id ON payments(yookassa_payment_id);






