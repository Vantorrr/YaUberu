-- Create tariffs table
CREATE TABLE IF NOT EXISTS tariffs (
    id SERIAL PRIMARY KEY,
    tariff_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    price INTEGER NOT NULL,
    old_price INTEGER,
    period VARCHAR(50),
    description VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_urgent BOOLEAN DEFAULT FALSE
);

-- Insert default tariffs
INSERT INTO tariffs (tariff_id, name, price, old_price, period, description, is_active, is_urgent) VALUES
('single', 'Разовый вынос', 150, NULL, NULL, 'Заберу мусор в удобное для вас время', TRUE, TRUE),
('trial', 'Пробный старт', 199, 756, '2 недели', '2 недели будем выносить ваш мусор через день', TRUE, FALSE),
('monthly', 'Комфорт Месяц', 1350, NULL, NULL, 'Регулярный вынос мусора по выбранному расписанию', TRUE, FALSE);

