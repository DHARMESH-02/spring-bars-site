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

const config = window.VSB_CONFIG || {};
const useCustomOtp = typeof config.OTP_ENDPOINT === "string" && config.OTP_ENDPOINT.trim() !== "";
const otpEndpoint = useCustomOtp ? config.OTP_ENDPOINT.trim() : null;
const isConfigured =
  config.SUPABASE_URL &&
  config.SUPABASE_ANON_KEY &&
  !config.SUPABASE_URL.includes("PASTE_") &&
  !config.SUPABASE_ANON_KEY.includes("PASTE_");
const supabaseClient = isConfigured
  ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
  : null;

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  return response.json();
}

async function sendOtpViaPhp(formData) {
  const { email, name } = formData;
  const result = await postJson(otpEndpoint, {
    action: "send",
    email: email.trim(),
    name: name.trim(),
  });
  if (!result.success) {
    throw new Error(result.message || "Failed to send OTP email.");
  }
}

async function verifyOtpViaPhp(email, otp) {
  const result = await postJson(otpEndpoint, {
    action: "verify",
    email: email.trim(),
    otp: otp.trim(),
  });
  if (!result.success) {
    throw new Error(result.message || "OTP verification failed.");
  }
}

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
let currentUser = null;
let currentProfile = null;

function formatPieces(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function setStatus(id, message, tone = "neutral") {
  const node = document.querySelector(id);
  if (!node) return;
  node.textContent = message;
  node.dataset.tone = tone;
}

function requireSupabase() {
  if (supabaseClient) return true;
  setStatus("#accountStatus", "Supabase is not configured yet. Add your project URL and anon key in config.js.", "error");
  setStatus("#orderStatus", "Online backend setup is required before orders can be placed.", "error");
  return false;
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

function fillProfileForm(profile) {
  if (!profile) return;
  registerForm.elements.name.value = profile.name || "";
  registerForm.elements.email.value = profile.email || "";
  registerForm.elements.contact.value = profile.contact || "";
  registerForm.elements.address.value = profile.address || "";
}

async function loadSession() {
  if (!supabaseClient) {
    renderProducts();
    renderCart();
    requireSupabase();
    return;
  }

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  currentUser = session?.user || null;

  if (!currentUser) {
    setStatus("#accountStatus", "Enter your details and request email OTP.");
    setStatus("#orderStatus", "Add products, verify email OTP, then place order.");
    return;
  }

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    setStatus("#accountStatus", error.message, "error");
    return;
  }

  currentProfile = profile;
  fillProfileForm(profile);
  setStatus("#accountStatus", `Signed in: ${currentUser.email}`, "success");
  setStatus("#orderStatus", "Ready to place an online order after adding products.", "success");
}

async function saveProfile(formData) {
  const profile = {
    id: currentUser.id,
    email: currentUser.email,
    name: formData.name.trim(),
    contact: formData.contact.trim(),
    address: formData.address.trim(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseClient.from("profiles").upsert(profile);
  if (error) throw error;
  currentProfile = profile;
}

async function renderAdmin() {
  if (!supabaseClient) return;

  const { data: orders, error } = await supabaseClient
    .from("orders")
    .select("id, created_at, status, packing, notes, items, profiles(name,email,contact,address)")
    .order("created_at", { ascending: false });

  if (error) {
    ordersList.innerHTML = `<p class="empty">${error.message}</p>`;
    return;
  }

  const customers = new Set(orders.map((order) => order.profiles?.email).filter(Boolean));
  const pieces = orders.reduce(
    (sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0),
    0
  );

  document.querySelector("#adminOrderCount").textContent = orders.length;
  document.querySelector("#adminPieceCount").textContent = formatPieces(pieces);
  document.querySelector("#adminCustomerCount").textContent = customers.size;

  if (!orders.length) {
    ordersList.innerHTML = '<p class="empty">No online orders yet.</p>';
    return;
  }

  ordersList.innerHTML = orders
    .map((order) => {
      const customer = order.profiles || {};
      return `
        <article class="order-row">
          <div class="order-head">
            <div>
              <strong>${order.id}</strong>
              <span>${new Date(order.created_at).toLocaleString("en-IN")}</span>
            </div>
            <span class="pill">${order.status}</span>
          </div>
          <div class="order-detail-grid">
            <div>
              <h4>Customer</h4>
              <p>${customer.name || ""}</p>
              <p>${customer.email || ""}</p>
              <p>${customer.contact || ""}</p>
              <p>${customer.address || ""}</p>
            </div>
            <div>
              <h4>Order</h4>
              <p><strong>Packing:</strong> ${order.packing}</p>
              <p><strong>Notes:</strong> ${order.notes || "No notes"}</p>
              <ul>${(order.items || []).map((item) => `<li>${item.name}: ${formatPieces(item.qty)} pcs</li>`).join("")}</ul>
            </div>
          </div>
        </article>
      `;
    })
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
  setStatus("#orderStatus", "Product added. Verify email OTP to place the order.", "success");
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(registerForm));

  if (useCustomOtp) {
    try {
      await sendOtpViaPhp(formData);
      sessionStorage.setItem("vsb.pendingProfile", JSON.stringify(formData));
      document.querySelector("#otpPreview").textContent = `OTP sent to ${formData.email.trim()}`;
      setStatus("#accountStatus", "Check email and enter the OTP.", "warning");
    } catch (error) {
      setStatus("#accountStatus", error.message, "error");
    }
    return;
  }

  if (!requireSupabase()) return;

  const formDataSupabase = formData;
  try {
    const { error } = await supabaseClient.auth.signInWithOtp({
      email: formDataSupabase.email.trim(),
      options: {
        shouldCreateUser: true,
        data: {
          name: formDataSupabase.name.trim(),
          contact: formDataSupabase.contact.trim(),
          address: formDataSupabase.address.trim(),
        },
      },
    });
    if (error) throw error;

    sessionStorage.setItem("vsb.pendingProfile", JSON.stringify(formDataSupabase));
    document.querySelector("#otpPreview").textContent = `OTP sent to ${formDataSupabase.email.trim()}`;
    setStatus("#accountStatus", "Check email and enter the OTP.", "warning");
  } catch (error) {
    setStatus("#accountStatus", error.message, "error");
  }
});

otpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const otp = new FormData(otpForm).get("otp").trim();
  const pendingProfile = JSON.parse(sessionStorage.getItem("vsb.pendingProfile") || "null");
  const email = pendingProfile?.email || registerForm.elements.email.value;

  if (useCustomOtp) {
    try {
      await verifyOtpViaPhp(email, otp);
      currentUser = { email: email.trim() };
      currentProfile = pendingProfile || {
        email: email.trim(),
        name: registerForm.elements.name.value.trim(),
        contact: registerForm.elements.contact.value.trim(),
        address: registerForm.elements.address.value.trim(),
      };
      document.querySelector("#otpPreview").textContent = "Email verified";
      otpForm.reset();
      setStatus("#accountStatus", `Verified and signed in: ${currentUser.email}`, "success");
      setStatus("#orderStatus", "Ready to place an online order.", "success");
    } catch (error) {
      setStatus("#accountStatus", error.message, "error");
    }
    return;
  }

  if (!requireSupabase()) return;

  try {
    const { data, error } = await supabaseClient.auth.verifyOtp({
      email: email.trim(),
      token: otp,
      type: "email",
    });
    if (error) throw error;

    currentUser = data.user;
    await saveProfile(pendingProfile || Object.fromEntries(new FormData(registerForm)));
    sessionStorage.removeItem("vsb.pendingProfile");
    document.querySelector("#otpPreview").textContent = "Email verified";
    otpForm.reset();
    setStatus("#accountStatus", `Verified and signed in: ${currentUser.email}`, "success");
    setStatus("#orderStatus", "Ready to place an online order.", "success");
  } catch (error) {
    setStatus("#accountStatus", error.message, "error");
  }
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireSupabase()) return;

  try {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      setStatus("#orderStatus", "Please verify email before placing order.", "error");
      location.hash = "#account";
      return;
    }
    if (!cart.size) {
      setStatus("#orderStatus", "Please add at least one product to cart.", "error");
      location.hash = "#products";
      return;
    }

    currentUser = user;
    const profileData = Object.fromEntries(new FormData(registerForm));
    await saveProfile(profileData);

    const orderData = Object.fromEntries(new FormData(orderForm));
    const { data: order, error } = await supabaseClient
      .from("orders")
      .insert({
        user_id: user.id,
        packing: orderData.packing,
        notes: orderData.notes.trim(),
        items: Array.from(cart.values()),
        status: "New order",
      })
      .select("id")
      .single();
    if (error) throw error;

    cart.clear();
    renderCart();
    orderForm.reset();
    setStatus("#orderStatus", `Online order saved: ${order.id}`, "success");
  } catch (error) {
    setStatus("#orderStatus", error.message, "error");
  }
});

adminLogin.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireSupabase()) return;

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) {
    adminLogin.querySelector(".status-line").textContent = "Verify your admin email OTP first.";
    adminLogin.querySelector(".status-line").dataset.tone = "error";
    location.hash = "#account";
    return;
  }

  if (!config.ADMIN_EMAILS?.includes(user.email)) {
    adminLogin.querySelector(".status-line").textContent = "This email is not approved for admin access.";
    adminLogin.querySelector(".status-line").dataset.tone = "error";
    return;
  }

  adminDashboard.hidden = false;
  adminLogin.querySelector(".status-line").textContent = "Admin panel open.";
  adminLogin.querySelector(".status-line").dataset.tone = "success";
  await renderAdmin();
});

document.querySelector("#exportOrders").addEventListener("click", async () => {
  if (!supabaseClient) return;
  const { data: orders, error } = await supabaseClient
    .from("orders")
    .select("id, created_at, status, packing, notes, items, profiles(name,email,contact,address)")
    .order("created_at", { ascending: false });
  if (error) {
    ordersList.innerHTML = `<p class="empty">${error.message}</p>`;
    return;
  }
  await navigator.clipboard?.writeText(JSON.stringify(orders, null, 2));
  document.querySelector("#exportOrders").textContent = "Copied JSON";
  setTimeout(() => {
    document.querySelector("#exportOrders").textContent = "Export orders";
  }, 1800);
});

document.querySelector("#clearOrders").addEventListener("click", () => {
  ordersList.innerHTML = '<p class="empty">For real online data, delete or update orders inside Supabase.</p>';
});

renderProducts();
renderCart();
loadSession();
