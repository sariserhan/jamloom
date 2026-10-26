ALTER TABLE academy_purchases DROP CONSTRAINT academy_purchases_product_key_check;
ALTER TABLE academy_purchases DROP CONSTRAINT academy_purchases_amount_cents_check;
ALTER TABLE academy_purchases ADD CONSTRAINT academy_product_price CHECK ((product_key='academy-complete' AND amount_cents=7999) OR (product_key='singing-complete' AND amount_cents=3900));
