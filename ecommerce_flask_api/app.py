from flask import Flask, request, jsonify 
from flask_cors import CORS
import pyodbc
import jwt
import datetime
import functools

app = Flask(__name__)


ALLOWED_ORIGINS = {"http://localhost:3000", "http://127.0.0.1:3000"}
CORS(
    app,
    resources={r"/*": {"origins": list(ALLOWED_ORIGINS)}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)

@app.after_request
def add_cors_headers(resp):
    # izin listesine uygunsa izin verir
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS:
        resp.headers["Access-Control-Allow-Origin"] = origin
    resp.headers["Access-Control-Allow-Credentials"] = "true"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    return resp


CONN_STR = (
    r"DRIVER={ODBC Driver 17 for SQL Server};"
    r"SERVER=LAPTOP-0JPPA6C7\ONB1900003285;"
    r"DATABASE=ecommerce;"
    r"Trusted_Connection=yes;"
)

def get_conn():
    return pyodbc.connect(CONN_STR, autocommit=True)


SECRET_KEY = "gizliAnahtar"

def get_or_create_cart(conn, user_id: int) -> int:
    cur = conn.cursor()

    # Sepet var mı ?
    cur.execute("SELECT id FROM carts WHERE user_id=?", (user_id,))
    row = cur.fetchone()
    if row:
        return int(row[0])

    # Yoksa oluştur ve id döndür
    try:
        cur.execute(
            "INSERT INTO carts (user_id) OUTPUT INSERTED.id VALUES (?)",
            (user_id,)
        )
        new_id = cur.fetchone()[0]
        return int(new_id)

    except pyodbc.IntegrityError as e:
        msg = str(e)
        if "2627" in msg or "2601" in msg:
            cur.execute("SELECT id FROM carts WHERE user_id=?", (user_id,))
            row = cur.fetchone()
            if row:
                return int(row[0])
        raise

def find_cart_id(conn, user_id: int):
    """Sepeti OLUŞTURMADAN, varsa cart_id döndürür; yoksa None."""
    cur = conn.cursor()
    cur.execute("SELECT id FROM carts WHERE user_id=?", (user_id,))
    row = cur.fetchone()
    return int(row[0]) if row else None    

def get_product_price(conn, product_id: int):
    cur = conn.cursor()
    cur.execute("SELECT price FROM products WHERE id=?", (product_id,))
    r = cur.fetchone()
    return float(r[0]) if r else None

def get_size_stock(conn, product_id: int, size: str) -> int:
    cur = conn.cursor()
    cur.execute(
        "SELECT stock FROM product_sizes WHERE product_id=? AND size=?",
        (product_id, size),
    )
    r = cur.fetchone()
    return int(r[0]) if r else 0

def token_required(f):
    @functools.wraps(f)
    def decorator(*args, **kwargs):
        if request.method == "OPTIONS":
            return ("", 204)

        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Token gerekli"}), 401

        token = auth.replace("Bearer ", "", 1)
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            return f(user_id=data["user_id"], *args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token süresi doldu"}), 401
        except Exception as e:
            print("token_required error:", e)
            return jsonify({"error": "Geçersiz veya süresi dolmuş token"}), 401
    return decorator



def _get_user_by_id(conn, user_id: int):
    cur = conn.cursor()
    cur.execute("SELECT id, username, email, password FROM users WHERE id=?", (user_id,))
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "username": row[1], "email": row[2], "password": row[3]}

@app.route("/me", methods=["GET", "OPTIONS"])
@token_required
def me(user_id):
    if request.method == "OPTIONS":
        return ("", 204)
    try:
        with get_conn() as conn:
            user = _get_user_by_id(conn, user_id)
            if not user:
                return jsonify({"error": "Kullanıcı bulunamadı"}), 404
        return jsonify({"id": user["id"], "username": user["username"], "email": user["email"]}), 200
    except Exception as e:
        print("me error:", e)
        return jsonify({"error": "server_error"}), 500

@app.route("/me", methods=["PUT", "OPTIONS"])
@token_required
def update_me(user_id):
    if request.method == "OPTIONS":
        return ("", 204)
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    if not username or not email:
        return jsonify({"error": "Kullanıcı adı ve e-posta gerekli"}), 400

    try:
        with get_conn() as conn:
            cur = conn.cursor()
            

            cur.execute(
                "UPDATE users SET username=?, email=? WHERE id=?",
                (username, email, user_id)
            )
        return jsonify({"message": "Profil bilgileri güncellendi"}), 200
    except Exception as e:
        print("update_me error:", e)
        return jsonify({"error": "server_error"}), 500

@app.route("/me/password", methods=["PUT", "OPTIONS"])
@token_required
def change_password(user_id):
    if request.method == "OPTIONS":
        return ("", 204)
    data = request.get_json(silent=True) or {}
    current_password = (data.get("current_password") or "")
    new_password = (data.get("new_password") or "")

    if not current_password or not new_password:
        return jsonify({"error": "Mevcut ve yeni şifre gereklidir"}), 400

    try:
        with get_conn() as conn:
            user = _get_user_by_id(conn, user_id)
            if not user:
                return jsonify({"error": "Kullanıcı bulunamadı"}), 404

            if (user["password"] or "") != current_password:
                return jsonify({"error": "Mevcut şifre yanlış"}), 400

            cur = conn.cursor()
            cur.execute("UPDATE users SET password=? WHERE id=?", (new_password, user_id))

        return jsonify({"message": "Şifre güncellendi"}), 200
    except Exception as e:
        print("change_password error:", e)
        return jsonify({"error": "server_error"}), 500
    

@app.route("/addresses", methods=["GET", "OPTIONS"])
@token_required
def get_addresses(user_id):
    if request.method == "OPTIONS":
        return ("", 204)
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            #  adres yoksa username yine de gelecek
            cur.execute("""
                SELECT a.id, a.invoice_type, a.city, a.address_text, u.username
                FROM users u
                LEFT JOIN addresses a ON a.user_id = u.id
                WHERE u.id = ?
            """, (user_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({"address": None, "username": ""}), 200

            username = row[4]
            if row[0] is None:
                # Adres hiç eklenmemiş
                return jsonify({"address": None, "username": username}), 200

            address = {
                "id": int(row[0]),
                "invoice_type": row[1],
                "city": row[2],
                "address_text": row[3],
            }
            return jsonify({"address": address, "username": username}), 200
    except Exception as e:
        print("get_addresses error:", e)
        return jsonify({"error": "server_error"}), 500


@app.route("/addresses", methods=["PUT", "OPTIONS"])
@token_required
def upsert_address(user_id):
    if request.method == "OPTIONS":
        return ("", 204)
    data = request.get_json(silent=True) or {}
    invoice_type = (data.get("invoice_type") or "").lower()
    city = (data.get("city") or "").strip()
    address_text = (data.get("address_text") or "").strip()

    if invoice_type not in ("bireysel", "kurumsal"):
        return jsonify({"error": "Fatura türü geçersiz"}), 400
    if not city or not address_text:
        return jsonify({"error": "Şehir ve adres gereklidir"}), 400

    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id FROM addresses WHERE user_id=?", (user_id,))
            row = cur.fetchone()
            if row:
                cur.execute("""
                    UPDATE addresses
                    SET invoice_type=?, city=?, address_text=?, updated_at=GETDATE()
                    WHERE id=?
                """, (invoice_type, city, address_text, int(row[0])))
                msg = "Adres güncellendi"
            else:
                cur.execute("""
                    INSERT INTO addresses (user_id, invoice_type, city, address_text, created_at, updated_at)
                    VALUES (?, ?, ?, ?, GETDATE(), GETDATE())
                """, (user_id, invoice_type, city, address_text))
                msg = "Adres eklendi"
        return jsonify({"message": msg}), 200
    except Exception as e:
        print("upsert_address error:", e)
        return jsonify({"error": "server_error"}), 500
@app.route("/addresses", methods=["DELETE", "OPTIONS"])
@token_required
def delete_address(user_id):
    if request.method == "OPTIONS":
        return ("", 204)
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM addresses WHERE user_id=?", (user_id,))
        return jsonify({"message": "Adres silindi"}), 200
    except Exception as e:
        print("delete_address error:", e)
        return jsonify({"error": "server_error"}), 500
    
@app.route("/checkout/init", methods=["GET", "OPTIONS"])
@token_required
def checkout_init(user_id):
    if request.method == "OPTIONS":
        return ("", 204)
    try:
        with get_conn() as conn:
            cur = conn.cursor()

            # 1) Kullanıcı adı
            cur.execute("SELECT username FROM users WHERE id=?", (user_id,))
            r = cur.fetchone()
            username = r[0] if r else ""

            # 2) Adresler
            cur.execute("""
                SELECT id, invoice_type, city, address_text
                FROM addresses
                WHERE user_id=?
                ORDER BY id DESC
            """, (user_id,))
            addresses = [
                {
                    "id": int(row[0]),
                    "invoice_type": row[1],
                    "city": row[2],
                    "address_text": row[3],
                }
                for row in cur.fetchall()
            ]

            # 3) Sepet özeti
            cart_id = find_cart_id(conn, user_id)
            if not cart_id:
                return jsonify({
                    "username": username,
                    "addresses": addresses,
                    "cart": {"items": [], "total": 0.0}
                }), 200

            cur.execute("""
                SELECT ci.product_id, p.name, ci.size, ci.quantity, ci.unit_price
                FROM cart_items ci
                JOIN products p ON p.id = ci.product_id
                WHERE ci.cart_id=?
            """, (cart_id,))
            rows = cur.fetchall()

            items = []
            total = 0.0
            for row in rows:
                qty = int(row[3])
                price = float(row[4])
                items.append({
                    "product_id": int(row[0]),
                    "name": row[1],
                    "size": row[2],
                    "quantity": qty,
                    "price": price,
                })
                total += qty * price

        return jsonify({
            "username": username,
            "addresses": addresses,
            "cart": {"items": items, "total": round(total, 2)}
        }), 200

    except Exception as e:
        print("checkout_init error:", e)
        return jsonify({"error": "server_error"}), 500
@app.route("/checkout/confirm", methods=["POST", "OPTIONS"])
@token_required
def checkout_confirm(user_id):
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json() or {}
    address_id = data.get("addressId")

    if not address_id:
        return jsonify({"error": "Adres gerekli"}), 400

    try:
        with get_conn() as conn:
            cur = conn.cursor()

            cart_id = find_cart_id(conn, user_id)
            if not cart_id:
                return jsonify({"error": "Sepet boş"}), 400

            cur.execute("""
                SELECT ci.product_id, ci.size, ci.quantity, ci.unit_price
                FROM cart_items ci
                WHERE ci.cart_id=?
            """, (cart_id,))
            rows = cur.fetchall()
            if not rows:
                return jsonify({"error": "Sepet boş"}), 400

            total = sum(r[2] * float(r[3]) for r in rows)

            # sipariş 
            cur.execute("INSERT INTO orders (user_id, address_id, total, created_at) OUTPUT INSERTED.id VALUES (?, ?, ?, GETDATE())",
                        (user_id, address_id, total))
            order_id = cur.fetchone()[0]

            
            for r in rows:
                cur.execute("""
                    INSERT INTO order_items (order_id, product_id, size, quantity, price)
                    VALUES (?,?,?,?,?)
                """, (order_id, r[0], r[1], r[2], float(r[3])))

            # sepet temizle
            cur.execute("DELETE FROM cart_items WHERE cart_id=?", (cart_id,))
            cur.execute("DELETE FROM carts WHERE id=?", (cart_id,))

        return jsonify({"status": "OK", "orderId": order_id})
    except Exception as e:
        print("checkout_confirm error:", e)
        return jsonify({"error": "server_error"}), 500
@app.route("/orders", methods=["GET", "OPTIONS"])
@token_required
def orders_list(user_id):
    if request.method == "OPTIONS":
        return ("", 204)
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id, total, created_at FROM orders WHERE user_id=? ORDER BY created_at DESC", (user_id,))
            orders = []
            for oid, total, created_at in cur.fetchall():
                cur2 = conn.cursor()
                cur2.execute("""
                    SELECT oi.product_id, p.name, oi.size, oi.quantity, oi.price
                    FROM order_items oi
                    JOIN products p ON p.id = oi.product_id
                    WHERE oi.order_id=?
                """, (oid,))
                items = [{"product_id": r[0], "name": r[1], "size": r[2], "quantity": r[3], "price": float(r[4])}
                         for r in cur2.fetchall()]
                orders.append({
                    "id": oid,
                    "total": float(total),
                    "created_at": str(created_at),
                    "items": items
                })
        return jsonify(orders)
    except Exception as e:
        print("orders_list error:", e)
        return jsonify({"error": "server_error"}), 500                
@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Backend is working!"})

@app.route("/register", methods=["POST", "OPTIONS"])
def register():
    if request.method == "OPTIONS":
        return ("", 204)
    data = request.get_json(silent=True) or {}
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1 FROM users WHERE username=? OR email=?", (username, email))
            if cur.fetchone():
                return jsonify({"error": "Bu kullanıcı adı veya e-posta zaten kullanılıyor."}), 409

            cur.execute(
                "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
                (username, email, password)
            )
        return jsonify({"message": "Kayıt başarılı!"}), 201
    except Exception as e:
        print("register error:", e)
        return jsonify({"error": "server_error"}), 500

@app.route("/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return ("", 204)
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")

    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id, username FROM users WHERE email=? AND password=?", (email, password))
            row = cur.fetchone()
            if not row:
                return jsonify({"error": "Geçersiz e-posta veya şifre"}), 401

            user_id, username = row[0], row[1]
            payload = {
                "user_id": user_id,
                "username": username,
                "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
            }
            token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

            cur.execute(
                "INSERT INTO login_sessions (user_id, login_time) VALUES (?, ?)",
                (user_id, datetime.datetime.now())
            )

        return jsonify({"message": "Giriş başarılı", "username": username, "token": token}), 200
    except Exception as e:
        print("login error:", e)
        return jsonify({"error": "server_error"}), 500

@app.route("/products", methods=["GET", "OPTIONS"])
def get_products():
    if request.method == "OPTIONS":
        return ("", 204)
    category = request.args.get("category", type=str)

    try:
        with get_conn() as conn:
            cur = conn.cursor()
            if category:
                cur.execute("""
                    SELECT id, name, description, category, price, stock, image_url, color, fabric_type, sizes
                    FROM products
                    WHERE category = ?
                    ORDER BY id DESC
                """, (category,))
            else:
                cur.execute("""
                    SELECT id, name, description, category, price, stock, image_url, color, fabric_type, sizes
                    FROM products
                    ORDER BY id DESC
                """)
            rows = cur.fetchall()
            cols = [c[0] for c in cur.description]
        products = [dict(zip(cols, r)) for r in rows]
        return jsonify(products), 200
    except Exception as e:
        print("get_products error:", e)
        return jsonify({"error": "server_error"}), 500

@app.route("/products/<int:product_id>", methods=["GET", "OPTIONS"])
def get_product_by_id(product_id):
    if request.method == "OPTIONS":
        return ("", 204)
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, name, description, category, price, stock, image_url, color, fabric_type, sizes
                FROM products
                WHERE id = ?
            """, (product_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({"error": "Ürün bulunamadı."}), 404
            cols = [c[0] for c in cur.description]
        product = dict(zip(cols, row))
        return jsonify(product), 200
    except Exception as e:
        print("get_product_by_id error:", e)
        return jsonify({"error": "server_error"}), 500

@app.route("/cart/add", methods=["POST", "OPTIONS"])
@token_required
def cart_add(user_id):
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}
    try:
        product_id = int(data.get("product_id"))
    except (TypeError, ValueError):
        return jsonify({"error": "Geçersiz ürün ID"}), 400
    
    size = ((data.get("size") or "S").strip()).upper()
    qty  = int(data.get("quantity") or 1)

    try:
        with get_conn() as conn:
            #  önce ürün ve stok var mı bakıyoruz sepeti henüz oluşturmuyor
            price = get_product_price(conn, product_id)
            if price is None:
                return jsonify({"error": "Ürün bulunamadı"}), 404

            stock = get_size_stock(conn, product_id, size)
            if stock <= 0:
                return jsonify({
                    "status": "OUT_OF_STOCK",
                    "message": "Stoklar tükendi, sepete eklenemiyor."
                }), 400

            if stock == 1 and qty > 1:
                return jsonify({
                    "status": "ONLY_ONE_LEFT",
                    "available": 1,
                    "message": "Sepetinize eklemek istediğiniz üründen şu anda stoklarımızda 1 adet mevcuttur."
                }), 400

            #  Her şey yolundaysa sepeti oluşturur
            cart_id = get_or_create_cart(conn, user_id)

            # Aynı ürün beden sepette var mı diye kontrol 
            cur = conn.cursor()
            cur.execute(
                """SELECT id, quantity FROM cart_items
                   WHERE cart_id=? AND product_id=? AND size=?""",
                (cart_id, product_id, size),
            )
            row = cur.fetchone()
            #varsa
            if row:
                item_id, existing = row
                new_qty = min(existing + qty, stock)
                cur.execute("UPDATE cart_items SET quantity=? WHERE id=?", (new_qty, item_id))
            else:
                add_qty = min(qty, stock)
                cur.execute(
                    """INSERT INTO cart_items (cart_id, product_id, size, quantity, unit_price)
                       VALUES (?,?,?,?,?)""",
                    (cart_id, product_id, size, add_qty, price),
                )

        # stok tam 1 se mesaj
        if stock == 1:
            return jsonify({
                "status": "ONLY_ONE_LEFT",
                "message": "Sepetinize eklemek istediğiniz üründen şu anda stoklarımızda 1 adet mevcuttur."
            }), 200

        return jsonify({"status": "ADDED", "message": "Sepete eklendi."}), 200

    except Exception as e:
        print("cart_add error:", e)
        return jsonify({"error": "server_error"}), 500


@app.route("/cart", methods=["GET", "OPTIONS"])
@token_required
def cart_get(user_id):
    if request.method == "OPTIONS":
        return ("", 204)

    try:
        with get_conn() as conn:
            cart_id = find_cart_id(conn, user_id)
            if not cart_id:
                return jsonify({"items": [], "total": 0.0}), 200

            cur = conn.cursor()
            cur.execute(
                """
                SELECT ci.id, ci.product_id, p.name, p.image_url,
                       ci.size, ci.quantity, ci.unit_price,
                       (SELECT stock FROM product_sizes ps
                         WHERE ps.product_id = ci.product_id AND ps.size = ci.size) AS size_stock
                FROM cart_items ci
                JOIN products p ON p.id = ci.product_id
                WHERE ci.cart_id=?
                """,
                (cart_id,)
            )
            rows = cur.fetchall()

        items = []
        total = 0.0
        for r in rows:
            item = {
                "id": r[0],
                "product_id": r[1],
                "name": r[2],
                "image": r[3],
                "size": r[4],
                "quantity": int(r[5]),
                "unit_price": float(r[6]),
                "size_stock": int(r[7] or 0),
            }
            total += item["unit_price"] * item["quantity"]
            items.append(item)

        return jsonify({"items": items, "total": round(total, 2)}), 200

    except Exception as e:
        print("cart_get error:", e)
        return jsonify({"error": "server_error"}), 500

@app.route("/cart/item/<int:item_id>", methods=["PATCH", "OPTIONS"])
@token_required
def cart_update(user_id, item_id):
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}
    try:
        new_qty = int(data.get("quantity"))
    except (TypeError, ValueError):
        return jsonify({"error": "Geçersiz adet"}), 400
    if new_qty <= 0:
        return jsonify({"error": "Adet 1'den küçük olamaz"}), 400

    try:
        with get_conn() as conn:
            cur = conn.cursor()
            
            cur.execute(
                """SELECT ci.product_id, ci.size
                   FROM cart_items ci
                   JOIN carts c ON c.id = ci.cart_id
                   WHERE ci.id=? AND c.user_id=?""",
                (item_id, user_id),
            )
            row = cur.fetchone()
            if not row:
                return jsonify({"error": "Ürün bulunamadı"}), 404

            product_id, size = row
            stock = get_size_stock(conn, product_id, size)
            if stock <= 0:
                return jsonify({"error": "Stok yok"}), 400

            new_qty = min(new_qty, stock)
            cur.execute("UPDATE cart_items SET quantity=? WHERE id=?",
                        (new_qty, item_id))

        return jsonify({"ok": True, "quantity": new_qty}), 200

    except Exception as e:
        print("cart_update error:", e)
        return jsonify({"error": "server_error"}), 500

@app.route("/cart/item/<int:item_id>", methods=["DELETE", "OPTIONS"])
@token_required
def cart_delete(user_id, item_id):
    if request.method == "OPTIONS":
        return ("", 204)

    try:
        with get_conn() as conn:
            cur = conn.cursor()

            # ürün bu kullanıcıya mı ait cart_id'yi al
            cur.execute(
                """SELECT ci.cart_id
                   FROM cart_items ci
                   JOIN carts c ON c.id = ci.cart_id
                   WHERE ci.id=? AND c.user_id=?""",
                (item_id, user_id),
            )
            row = cur.fetchone()
            if not row:
                return jsonify({"error": "Ürün bulunamadı"}), 404

            cart_id = int(row[0])

            # ürünü siler
            cur.execute("DELETE FROM cart_items WHERE id=?", (item_id,))

            # Sepette başka ürün kalmadıysa sepeti de siler
            cur.execute("SELECT COUNT(*) FROM cart_items WHERE cart_id=?", (cart_id,))
            remaining = cur.fetchone()[0]
            cart_deleted = False
            if remaining == 0:
                cur.execute("DELETE FROM carts WHERE id=? AND user_id=?", (cart_id, user_id))
                cart_deleted = True

        return jsonify({"ok": True, "cart_deleted": cart_deleted}), 200

    except Exception as e:
        print("cart_delete error:", e)
        return jsonify({"error": "server_error"}), 500            

@app.route("/categories", methods=["GET", "OPTIONS"])
def get_categories():
    if request.method == "OPTIONS":
        return ("", 204)
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category")
            rows = cur.fetchall()
        return jsonify([r[0] for r in rows]), 200
    except Exception as e:
        print("get_categories error:", e)
        return jsonify({"error": "server_error"}), 500

#Favorites 
@app.route("/favorites/add", methods=["POST", "OPTIONS"])
@token_required
def add_favorite(user_id):
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    try:
        product_id = int(product_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Geçersiz ürün ID"}), 400

    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1 FROM favorites WHERE user_id=? AND product_id=?", (user_id, product_id))
            if cur.fetchone():
                return jsonify({"message": "Ürün zaten favorilerde"}), 200
            cur.execute("INSERT INTO favorites (user_id, product_id) VALUES (?, ?)", (user_id, product_id))
        return jsonify({"message": "Favorilere eklendi"}), 201
    except Exception as e:
        print("add_favorite error:", e)
        return jsonify({"error": "server_error"}), 500

@app.route("/favorites/list", methods=["GET", "OPTIONS"])
@token_required
def list_favorites(user_id):
    if request.method == "OPTIONS":
        return ("", 204)
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT p.id, p.name, p.price, p.image_url
                FROM favorites f
                JOIN products p ON f.product_id = p.id
                WHERE f.user_id=?
            """, (user_id,))
            rows = cur.fetchall()
        favorites = [{"id": r[0], "name": r[1], "price": r[2], "image_url": r[3]} for r in rows]
        return jsonify(favorites), 200
    except Exception as e:
        print("list_favorites error:", e)
        return jsonify({"error": "server_error"}), 500

@app.route("/favorites/remove", methods=["POST", "OPTIONS"])
@token_required
def remove_favorite(user_id):
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    try:
        product_id = int(product_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Geçersiz ürün ID"}), 400

    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM favorites WHERE user_id=? AND product_id=?", (user_id, product_id))
        return jsonify({"message": "Favorilerden çıkarıldı"}), 200
    except Exception as e:
        print("remove_favorite error:", e)
        return jsonify({"error": "server_error"}), 500

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)