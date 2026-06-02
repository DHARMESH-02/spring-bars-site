const products = [
  {
    id: "SB-DF-18",
    name: "Double Flange Spring Bars",
    tag: "standard",
    description: "Everyday replacement spring bars for watch repair counters and strap sellers.",
    size: "8-24 mm",
    diameter: "1.5 / 1.8 mm",
    moq: 1000,
  },
  {
    id: "SB-QR-20",
    name: "Quick Release Spring Bars",
    tag: "quick",
    description: "Built-in lever pins for leather, silicone, and fashion strap production.",
    size: "14-24 mm",
    diameter: "1.5 / 1.8 mm",
    moq: 2000,
  },
  {
    id: "SB-HD-22",
    name: "Heavy Duty Spring Bars",
    tag: "heavy",
    description: "Thicker bars for diver-style watches, steel bracelets, and rugged straps.",
    size: "18-24 mm",
    diameter: "2.0 / 2.5 mm",
    moq: 1000,
  },
  {
    id: "SB-CV-20",
    name: "Curved Spring Bars",
    tag: "standard",
    description: "Curved profile for snug-fitting straps and shaped watch cases.",
    size: "18-22 mm",
    diameter: "1.8 mm",
    moq: 1000,
  },
  {
    id: "SB-SL-20",
    name: "Shoulderless Spring Bars",
    tag: "heavy",
    description: "Clean end profile for drilled lug cases and high-security strap fitting.",
    size: "16-24 mm",
    diameter: "1.8 / 2.0 mm",
    moq: 1500,
  },
  {
    id: "SB-AS-360",
    name: "360 Piece Assortment Box",
    tag: "assortment",
    description: "Dealer-ready replacement kit with multiple lengths and labeled sections.",
    size: "8-24 mm",
    diameter: "Mixed",
    moq: 100,
  },
];

const storageKeys = {
  customer: "vijay.customer",
  orders: "vijay.orders",
  otp: "vijay.pendingOtp",
};

const grid = document.querySelector("#productGrid");
const cartItems = document.querySelector("#cartItems");
const cartTotal = document.querySelector("#cartTotal");
const filters = document.querySelectorAll(".filter");
const registerForm = document.querySelector("#registerForm");
const otpForm = document.querySelector("#otpForm");
const orderForm = document.querySelector("#orderForm");
const adminLogin = document.querySelector("#adminLogin");
const adminDashboard = document.querySelector("#adminDashboard");
const ordersList = document.querySelector("#ordersList");
const cart = new Map();

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatPieces(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function getCustomer() {
  return readJson(storageKeys.customer, null);
}

function setStatus(id, message, tone = "neutral") {
  const node = document.querySelector(id);
  if (!node) return;
  node.textContent = message;
  node.dataset.tone = tone;
}

function renderProducts(activeFilter = "all") {
  const visible = products.filter((product) => activeFilter === "all" || product.tag === activeFilter);

  grid.innerHTML = visible
    .map(
      (product) => `
      <article class="product-card">
        <div class="product-top">
          <div>
            <h3>${product.name}</h3>
            <p>${product.description}</p>
          </div>
          <span class="pill">${product.id}</span>
        </div>
        <ul class="spec-list">
          <li><span>Size range</span><strong>${product.size}</strong></li>
          <li><span>Diameter</span><strong>${product.diameter}</strong></li>
          <li><span>MOQ</span><strong>${formatPieces(product.moq)} pcs</strong></li>
        </ul>
        <div class="product-actions">
          <input class="qty" type="number" min="${product.moq}" step="${product.moq}" value="${product.moq}" aria-label="Quantity for ${product.name}" />
          <button class="button primary add-button" type="button" data-id="${product.id}">Add to cart</button>
        </div>
      </article>
    `
    )
    .join("");
}

function renderCart() {
  if (!cart.size) {
    cartItems.innerHTML = '<p class="empty">No items added yet.</p>';
    cartTotal.textContent = "0";
    return;
  }

  let total = 0;
  cartItems.innerHTML = Array.from(cart.values())
    .map((item) => {
      total += item.qty;
      return `
        <div class="cart-row">
          <span><strong>${item.name}</strong>${item.id}</span>
          <span>${formatPieces(item.qty)} pcs</span>
        </div>
      `;
    })
    .join("");
  cartTotal.textContent = formatPieces(total);
}

function renderAccountState() {
  const customer = getCustomer();
  if (!customer) {
    setStatus("#accountStatus", "No verified customer yet.");
    setStatus("#orderStatus", "Add products and verify email before ordering.");
    return;
  }

  const verifiedText = customer.verified
    ? `Verified: ${customer.name} (${customer.email})`
    : `OTP sent to ${customer.email}. Verification pending.`;
  setStatus("#accountStatus", verifiedText, customer.verified ? "success" : "warning");
  setStatus(
    "#orderStatus",
    customer.verified ? "Ready to place an order after adding products." : "Verify email before ordering.",
    customer.verified ? "success" : "warning"
  );

  registerForm.elements.name.value = customer.name || "";
  registerForm.elements.email.value = customer.email || "";
  registerForm.elements.contact.value = customer.contact || "";
  registerForm.elements.address.value = customer.address || "";
}

function renderAdmin() {
  const orders = readJson(storageKeys.orders, []);
  const customers = new Set(orders.map((order) => order.customer.email));
  const pieces = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.qty, 0), 0);

  document.querySelector("#adminOrderCount").textContent = orders.length;
  document.querySelector("#adminPieceCount").textContent = formatPieces(pieces);
  document.querySelector("#adminCustomerCount").textContent = customers.size;

  if (!orders.length) {
    ordersList.innerHTML = '<p class="empty">No orders yet. Place a demo order from the customer area.</p>';
    return;
  }

  ordersList.innerHTML = orders
    .map(
      (order) => `
      <article class="order-row">
        <div class="order-head">
          <div>
            <strong>${order.id}</strong>
            <span>${new Date(order.createdAt).toLocaleString("en-IN")}</span>
          </div>
          <span class="pill">${order.status}</span>
        </div>
        <div class="order-detail-grid">
          <div>
            <h4>Customer</h4>
            <p>${order.customer.name}</p>
            <p>${order.customer.email}</p>
            <p>${order.customer.contact}</p>
            <p>${order.customer.address}</p>
          </div>
          <div>
            <h4>Order</h4>
            <p><strong>Packing:</strong> ${order.packing}</p>
            <p><strong>Notes:</strong> ${order.notes || "No notes"}</p>
            <ul>${order.items.map((item) => `<li>${item.name}: ${formatPieces(item.qty)} pcs</li>`).join("")}</ul>
          </div>
        </div>
      </article>
    `
    )
    .join("");
}

filters.forEach((button) => {
  button.addEventListener("click", () => {
    filters.forEach((filter) => filter.classList.remove("is-active"));
    button.classList.add("is-active");
    renderProducts(button.dataset.filter);
  });
});

grid.addEventListener("click", (event) => {
  const button = event.target.closest(".add-button");
  if (!button) return;

  const card = button.closest(".product-card");
  const qtyInput = card.querySelector(".qty");
  const product = products.find((item) => item.id === button.dataset.id);
  const qty = Math.max(Number(qtyInput.value) || product.moq, product.moq);
  const existing = cart.get(product.id);

  cart.set(product.id, {
    id: product.id,
    name: product.name,
    qty: existing ? existing.qty + qty : qty,
  });

  renderCart();
  setStatus("#orderStatus", "Product added. Register and verify email to place the order.", "success");
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(registerForm));
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const customer = {
    name: data.name.trim(),
    email: data.email.trim(),
    contact: data.contact.trim(),
    address: data.address.trim(),
    verified: false,
  };

  writeJson(storageKeys.customer, customer);
  writeJson(storageKeys.otp, { email: customer.email, otp });
  document.querySelector("#otpPreview").textContent = `Demo OTP: ${otp}`;
  setStatus("#accountStatus", `OTP generated for ${customer.email}.`, "warning");
  setStatus("#orderStatus", "Enter OTP to unlock ordering.", "warning");
});

otpForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const pending = readJson(storageKeys.otp, null);
  const customer = getCustomer();
  const otp = new FormData(otpForm).get("otp").trim();

  if (!pending || !customer || pending.email !== customer.email || pending.otp !== otp) {
    setStatus("#accountStatus", "Incorrect OTP. Check the demo OTP and try again.", "error");
    return;
  }

  customer.verified = true;
  writeJson(storageKeys.customer, customer);
  localStorage.removeItem(storageKeys.otp);
  document.querySelector("#otpPreview").textContent = "Email verified";
  otpForm.reset();
  renderAccountState();
});

orderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const customer = getCustomer();
  if (!customer?.verified) {
    setStatus("#orderStatus", "Please verify email before placing order.", "error");
    location.hash = "#account";
    return;
  }
  if (!cart.size) {
    setStatus("#orderStatus", "Please add at least one product to cart.", "error");
    location.hash = "#products";
    return;
  }

  const data = Object.fromEntries(new FormData(orderForm));
  const orders = readJson(storageKeys.orders, []);
  const order = {
    id: `VSB-${String(orders.length + 1).padStart(4, "0")}`,
    createdAt: new Date().toISOString(),
    status: "New order",
    customer,
    packing: data.packing,
    notes: data.notes.trim(),
    items: Array.from(cart.values()),
  };

  orders.unshift(order);
  writeJson(storageKeys.orders, orders);
  cart.clear();
  renderCart();
  orderForm.reset();
  setStatus("#orderStatus", `Order ${order.id} placed. Admin can view it now.`, "success");
  renderAdmin();
});

adminLogin.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = new FormData(adminLogin).get("password");
  if (password !== "admin123") {
    adminLogin.querySelector(".status-line").textContent = "Wrong password.";
    adminLogin.querySelector(".status-line").dataset.tone = "error";
    return;
  }

  adminDashboard.hidden = false;
  adminLogin.querySelector(".status-line").textContent = "Admin panel open.";
  adminLogin.querySelector(".status-line").dataset.tone = "success";
  renderAdmin();
});

document.querySelector("#exportOrders").addEventListener("click", () => {
  const orders = readJson(storageKeys.orders, []);
  const payload = JSON.stringify(orders, null, 2);
  navigator.clipboard?.writeText(payload);
  document.querySelector("#exportOrders").textContent = "Copied JSON";
  setTimeout(() => {
    document.querySelector("#exportOrders").textContent = "Export orders";
  }, 1800);
});

document.querySelector("#clearOrders").addEventListener("click", () => {
  localStorage.removeItem(storageKeys.orders);
  renderAdmin();
});

renderProducts();
renderCart();
renderAccountState();
