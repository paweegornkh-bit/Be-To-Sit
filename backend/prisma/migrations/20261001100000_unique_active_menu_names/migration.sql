CREATE UNIQUE INDEX "menu_items_active_name_unique"
ON "menu_items" (LOWER(BTRIM("name")))
WHERE "is_deleted" = false;