def serialize(obj):
    if isinstance(obj, list):
        return [serialize(item) for item in obj]
    if hasattr(obj, "__dict__"):
        d = obj.__dict__.copy()
        for k, v in d.items():
            d[k] = serialize(v)
        return d
    return obj