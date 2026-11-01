-- 產品詢問表單收件（Worker yaocare-inquiry-form → D1 yaocare-inquiries）
CREATE TABLE IF NOT EXISTS inquiries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT    NOT NULL,
  org        TEXT    NOT NULL,
  contact    TEXT    NOT NULL,
  reach      TEXT    NOT NULL,
  product    TEXT,
  message    TEXT,
  page       TEXT,
  country    TEXT,
  slack_ok   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at);
