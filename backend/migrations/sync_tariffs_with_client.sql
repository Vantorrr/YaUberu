-- Sync tariff_prices with client view
-- Drop old tariffs and recreate with correct structure

DELETE FROM tariff_prices;

-- Insert 4 tariffs matching client display
INSERT INTO tariff_prices (tariff_id, name, price, old_price, period, description, is_active, is_urgent) VALUES
('single', 'Разовый вынос', 139, NULL, NULL, 'Заберу мусор в удобное для вас время', TRUE, FALSE),
('single_urgent', 'Срочный вынос', 250, NULL, NULL, 'Приедем в течение часа', TRUE, TRUE),
('trial', 'Первая подписка', 292, 973, '2 недели', 'Две недели будем выносить ваш мусор через день', TRUE, FALSE),
('monthly_14', 'Комфорт 2 недели', 756, NULL, '14 дней', 'Регулярный вынос мусора в течение 14 дней', TRUE, FALSE),
('monthly_30', 'Комфорт месяц', 1460, NULL, '30 дней', 'Регулярный вынос мусора в течение 30 дней', TRUE, FALSE);

