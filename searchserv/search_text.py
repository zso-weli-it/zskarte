# In a LIKE pattern, % and _ match any text and \ is the escape character (PostgreSQL default).
def escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\%").replace("_", "\_")
