/* ============================================================
   PUVELA — Giỏ hàng + Checkout (COD / chuyển khoản)
   - Lưu giỏ ở localStorage, dùng chung 3 trang.
   - Tự chèn drawer + form. Ghi đơn vào Supabase `orders` (cần cột items jsonb).
   - Freeship đơn từ 1.500.000₫, phí ship 30.000₫ nếu dưới ngưỡng.
   Yêu cầu: nạp SAU assets/supabase.js. Nút mở giỏ: [data-cart-toggle].
   ============================================================ */
(function () {
  var KEY = "puvela-cart";
  var FREESHIP = 1500000, SHIP = 30000;
  var BANK = { bank: "Vietcombank", stk: "0123456789", ten: "CONG TY PUVELA" },
      LIENHE = { zalo: "0123456789", hotline: "0123456789" }   // TODO: điền số thật; // TODO: thay số thật

  function money(n){ return (n||0).toLocaleString("vi-VN") + "₫"; }
  function load(){ try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch(e){ return []; } }
  function save(c){ localStorage.setItem(KEY, JSON.stringify(c)); render(); }
  function count(c){ return (c||load()).reduce(function(s,i){ return s + i.qty; }, 0); }
  function subtotal(c){ return (c||load()).reduce(function(s,i){ return s + i.price * i.qty; }, 0); }
  function ship(sub){ return sub >= FREESHIP || sub === 0 ? 0 : SHIP; }

  function add(item){
    var c = load();
    var id = item.slug + "|" + item.label;
    var ex = c.find(function(i){ return (i.slug + "|" + i.label) === id; });
    if (ex) ex.qty += (item.qty || 1);
    else c.push({ slug:item.slug, name:item.name, label:item.label, price:item.price, image:item.image||"", qty:item.qty||1 });
    save(c); open();
  }
  function setQty(id, q){
    var c = load(); var it = c.find(function(i){ return (i.slug+"|"+i.label)===id; });
    if (!it) return;
    it.qty = q; if (it.qty <= 0) c = c.filter(function(i){ return (i.slug+"|"+i.label)!==id; });
    save(c);
  }
  function clear(){ localStorage.removeItem(KEY); render(); }

  // ---------- UI (chèn 1 lần) ----------
  var root;
  function build(){
    var css = document.createElement("style");
    css.textContent =
    ".pv-drawer button{font-family:'Be Vietnam Pro',sans-serif}.pv-ov{position:fixed;inset:0;background:rgba(32,28,24,.5);opacity:0;visibility:hidden;transition:.25s;z-index:60}"+
    ".pv-ov.show{opacity:1;visibility:visible}"+
    ".pv-drawer{position:fixed;top:0;right:0;height:100%;width:min(420px,100%);background:#f5f0e7;color:#2b2621;transform:translateX(100%);transition:.3s cubic-bezier(.4,0,.2,1);z-index:61;display:flex;flex-direction:column;font-family:'Be Vietnam Pro',sans-serif}"+
    ".pv-drawer.show{transform:none}"+
    ".pv-h{display:flex;justify-content:space-between;align-items:center;padding:22px 24px;border-bottom:1px solid rgba(45,41,38,.15)}"+
    ".pv-h b{font:500 14px/1 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase}"+
    ".pv-x{border:0;background:none;font-size:26px;line-height:1;cursor:pointer;color:inherit}"+
    ".pv-body{flex:1;overflow:auto;padding:8px 24px}"+
    ".pv-empty{padding:60px 0;text-align:center;color:#8a827a;font-size:14px}"+
    ".pv-it{display:flex;gap:14px;padding:18px 0;border-bottom:1px solid rgba(45,41,38,.12)}"+
    ".pv-it img{width:64px;height:78px;object-fit:cover;background:#e8e0d5;flex:none}"+
    ".pv-it .nm{font-size:14px;font-weight:600;line-height:1.3}"+
    ".pv-it .lb{font-size:12px;color:#8a827a;margin:3px 0 8px}"+
    ".pv-it .pr{font-size:13px}"+
    ".pv-qty{display:inline-flex;align-items:center;gap:12px;margin-top:8px;border:1px solid rgba(45,41,38,.25);padding:3px 10px}"+
    ".pv-qty button{border:0;background:none;cursor:pointer;font-size:15px;line-height:1;color:inherit}"+
    ".pv-rm{margin-left:14px;background:none;border:0;color:#8a827a;cursor:pointer;font-size:11px;text-decoration:underline}"+
    ".pv-foot{padding:20px 24px;border-top:1px solid rgba(45,41,38,.15)}"+
    ".pv-row{display:flex;justify-content:space-between;font-size:13px;margin-bottom:9px;color:#5e5853}"+
    ".pv-row.tot{font-size:16px;color:#2b2621;font-weight:600;margin:14px 0 0;padding-top:12px;border-top:1px solid rgba(45,41,38,.15)}"+
    ".pv-btn{width:100%;margin-top:16px;padding:16px;border:1px solid #9c5a41;background:#9c5a41;color:#fff;cursor:pointer;font:500 11px 'IBM Plex Mono',monospace;letter-spacing:.06em;text-transform:uppercase;transition:.2s}"+
    ".pv-btn:hover{background:transparent;color:#2b2621}"+
    ".pv-btn:disabled{opacity:.4;cursor:not-allowed}"+
    ".pv-note{font-size:11px;color:#8a827a;text-align:center;margin-top:10px}"+
    ".pv-form{display:flex;flex-direction:column;gap:12px;padding:20px 24px;overflow:auto}"+
    ".pv-form label{font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:#6a635c;margin-bottom:-6px}"+
    ".pv-form input,.pv-form textarea{border:1px solid rgba(45,41,38,.25);background:#fff;padding:12px 13px;font:14px 'Be Vietnam Pro',sans-serif;color:inherit;outline:0;width:100%}"+
    ".pv-form textarea{min-height:60px;resize:vertical}"+
    ".pv-pay{display:flex;gap:10px}.pv-pay label{flex:1;display:flex;gap:8px;align-items:center;border:1px solid rgba(45,41,38,.25);padding:12px;cursor:pointer;margin:0;font:13px 'Be Vietnam Pro';text-transform:none;letter-spacing:0;color:#2b2621}"+
    ".pv-pay input{width:auto}.pv-bank{font-size:12px;line-height:1.6;background:#efe9e0;padding:12px;color:#4a453f}"+
    ".pv-back{background:none;border:0;color:#8a827a;cursor:pointer;font-size:12px;text-align:left;padding:0;text-decoration:underline}"+
    ".pv-done{padding:50px 28px;text-align:center}.pv-done h3{font:500 30px/1.1 'Cormorant Garamond',serif;margin:16px 0 10px;color:#2b2621}.pv-done .code{font:500 12px 'IBM Plex Mono',monospace;letter-spacing:.1em;background:#efe9e0;display:inline-block;padding:8px 14px;margin:8px 0}"+
    "@media(max-width:480px){.pv-drawer{width:100%}}";
    document.head.appendChild(css);

    root = document.createElement("div");
    root.innerHTML =
    '<div class="pv-ov" data-ov></div>'+
    '<aside class="pv-drawer" role="dialog" aria-label="Giỏ hàng">'+
      '<div class="pv-h"><b data-title>Giỏ hàng</b><button class="pv-x" data-close aria-label="Đóng">×</button></div>'+
      '<div class="pv-view-cart" style="display:flex;flex-direction:column;flex:1;min-height:0">'+
        '<div class="pv-body" data-items></div>'+
        '<div class="pv-foot" data-foot></div>'+
      '</div>'+
      '<form class="pv-form" data-checkout hidden>'+
        '<button type="button" class="pv-back" data-back>← Quay lại giỏ</button>'+
        '<label>Họ tên</label><input name="name" required placeholder="Nguyễn Văn A" />'+
        '<label>Số điện thoại</label><input name="phone" required inputmode="tel" type="tel" pattern="0[0-9\\s.]{8,13}" title="Số điện thoại Việt Nam, bắt đầu bằng 0 và có 10 số" placeholder="09xx xxx xxx" />'+
        '<label>Địa chỉ nhận hàng</label><textarea name="address" required placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"></textarea>'+
        '<label>Ghi chú (tuỳ chọn)</label><textarea name="note" placeholder="Ví dụ: giao giờ hành chính"></textarea>'+
        '<label>Thanh toán</label>'+
        '<div class="pv-pay">'+
          '<label><input type="radio" name="pay" value="cod" checked /> COD (nhận hàng trả tiền)</label>'+
          '<label><input type="radio" name="pay" value="bank" /> Chuyển khoản</label>'+
        '</div>'+
        '<div class="pv-bank" data-bank hidden></div>'+
        '<div class="pv-foot" data-foot2></div>'+
        '<button type="submit" class="pv-btn" data-submit>Đặt hàng</button>'+
        '<p class="pv-note">Bấm đặt hàng đồng nghĩa bạn đồng ý cho Puvela liên hệ xác nhận đơn.</p>'+
      '</form>'+
      '<div class="pv-done" data-done hidden></div>'+
    '</aside>';
    document.body.appendChild(root);

    root.querySelector("[data-ov]").onclick = close;
    root.querySelector("[data-close]").onclick = close;
    root.querySelector("[data-back]").onclick = function(){ showView("cart"); };
    root.querySelectorAll('input[name="pay"]').forEach(function(r){
      r.onchange = function(){
        var b = root.querySelector("[data-bank]");
        if (this.value === "bank"){ b.hidden = false; b.innerHTML = "Chuyển khoản tới:<br><b>"+BANK.bank+"</b> · "+BANK.stk+"<br>"+BANK.ten+"<br>Nội dung: <b>[SĐT của bạn]</b>"; }
        else b.hidden = true;
      };
    });
    root.querySelector("[data-checkout]").addEventListener("submit", submitOrder);
  }

  function showView(v){
    root.querySelector(".pv-view-cart").style.display = v === "cart" ? "flex" : "none";
    root.querySelector("[data-checkout]").style.display = v === "checkout" ? "flex" : "none";
    root.querySelector("[data-done]").style.display = v === "done" ? "block" : "none";
    root.querySelector("[data-title]").textContent = v === "checkout" ? "Thông tin giao hàng" : v === "done" ? "Đặt hàng thành công" : "Giỏ hàng";
    if (v === "checkout") renderFoot(root.querySelector("[data-foot2]"), true);
  }

  function open(){ if(!root) build(); render(); showView("cart"); root.querySelector(".pv-ov").classList.add("show"); root.querySelector(".pv-drawer").classList.add("show"); }
  function close(){ if(!root) return; root.querySelector(".pv-ov").classList.remove("show"); root.querySelector(".pv-drawer").classList.remove("show"); }

  function renderFoot(el, checkoutMode){
    var c = load(), sub = subtotal(c), sh = ship(sub), tot = sub + sh;
    el.innerHTML =
      '<div class="pv-row"><span>Tạm tính</span><b>'+money(sub)+'</b></div>'+
      '<div class="pv-row"><span>Phí giao hàng</span><b>'+(sh===0?'Miễn phí':money(sh))+'</b></div>'+
      '<div class="pv-row tot"><span>Tổng cộng</span><b>'+money(tot)+'</b></div>'+
      (checkoutMode ? '' : '<button class="pv-btn" data-go '+(c.length?'':'disabled')+'>Thanh toán</button>'+
        (sub<FREESHIP&&sub>0?'<p class="pv-note">Mua thêm '+money(FREESHIP-sub)+' để được freeship</p>':''));
    if (!checkoutMode){ var go = el.querySelector("[data-go]"); if (go) go.onclick = function(){ showView("checkout"); }; }
  }

  function render(){
    // cập nhật số lượng trên nav
    document.querySelectorAll("[data-cart-count]").forEach(function(e){ e.textContent = count(); });
    document.querySelectorAll(".bag[data-cart-toggle]").forEach(function(e){
      if (!e.querySelector("[data-cart-count]")) e.textContent = "Túi (" + count() + ")";
    });
    if (!root) return;
    var c = load(), items = root.querySelector("[data-items]");
    if (!c.length){ items.innerHTML = '<div class="pv-empty">Giỏ hàng của bạn đang trống.</div>'; }
    else items.innerHTML = c.map(function(i){
      var id = i.slug + "|" + i.label;
      return '<div class="pv-it"><img src="'+i.image+'" alt="" /><div style="flex:1;min-width:0">'+
        '<div class="nm">'+i.name+'</div><div class="lb">'+i.label+'</div><div class="pr">'+money(i.price)+'</div>'+
        '<div class="pv-qty"><button data-dec="'+id+'">−</button><span>'+i.qty+'</span><button data-inc="'+id+'">+</button>'+
        '<button class="pv-rm" data-rm="'+id+'">Xoá</button></div></div></div>';
    }).join("");
    items.querySelectorAll("[data-inc]").forEach(function(b){ b.onclick=function(){ var it=load().find(x=>x.slug+"|"+x.label===b.dataset.inc); setQty(b.dataset.inc, it.qty+1); }; });
    items.querySelectorAll("[data-dec]").forEach(function(b){ b.onclick=function(){ var it=load().find(x=>x.slug+"|"+x.label===b.dataset.dec); setQty(b.dataset.dec, it.qty-1); }; });
    items.querySelectorAll("[data-rm]").forEach(function(b){ b.onclick=function(){ setQty(b.dataset.rm, 0); }; });
    renderFoot(root.querySelector("[data-foot]"), false);
  }

  async function submitOrder(e){
    e.preventDefault();
    var f = e.target, c = load();
    if (!c.length){ close(); return; }
    // số điện thoại phải gọi lại được, nếu không thì đơn coi như mất
    var sdt = f.phone.value.replace(/[^\d]/g, "");
    if (!/^0\d{9}$/.test(sdt)) {
      f.phone.setCustomValidity("Số điện thoại phải có 10 số và bắt đầu bằng 0");
      f.phone.reportValidity();
      return;
    }
    f.phone.setCustomValidity("");
    var btn = f.querySelector("[data-submit]"); btn.disabled = true; btn.textContent = "Đang gửi...";
    var sub = subtotal(c), sh = ship(sub), tot = sub + sh;
    var order = {
      code: "PV" + Date.now(),
      customer_name: f.name.value.trim(),
      phone: sdt,
      address: f.address.value.trim(),
      note: f.note.value.trim(),
      payment_method: f.pay.value,
      status: "new",
      subtotal: sub, shipping_fee: sh, total: tot,
      items: c.map(function(i){ return { slug:i.slug, name:i.name, label:i.label, price:i.price, qty:i.qty }; })
    };
    // Đơn phải VÀO ĐƯỢC máy chủ thì mới báo thành công.
    // Báo thành công giả = khách ngồi đợi, shop không biết có đơn.
    var ok = false, loi = "";
    if (window.puvela && window.puvela.client) {
      try {
        var r = await window.puvela.client.from("orders").insert([order]);
        ok = !r.error;
        if (r.error) { loi = r.error.message || "Máy chủ từ chối đơn"; console.error("[Puvela] Lỗi tạo đơn:", loi); }
      } catch (err) { loi = (err && err.message) || "Không kết nối được máy chủ"; console.error("[Puvela] Lỗi mạng khi đặt đơn:", err); }
    } else { loi = "Cửa hàng chưa kết nối máy chủ"; console.warn("[Puvela] Supabase chưa cấu hình — đơn CHƯA lưu:", order); }

    // luôn giữ một bản trong máy khách để không mất thông tin họ vừa nhập
    try { var hist = JSON.parse(localStorage.getItem("puvela-orders")||"[]"); hist.push(Object.assign({daGui:ok}, order)); localStorage.setItem("puvela-orders", JSON.stringify(hist)); } catch(_){}
    btn.disabled = false; btn.textContent = "Đặt hàng";

    var d = root.querySelector("[data-done]");
    if (!ok) {
      // KHÔNG xoá giỏ — để khách bấm lại được ngay
      var mon = c.map(function(i){ return i.name + " " + i.label + " x" + i.qty; }).join(", ");
      var tin = encodeURIComponent("Mình muốn đặt: " + mon + ". Tên: " + order.customer_name + ", SĐT: " + order.phone);
      d.innerHTML = '<div style="font-size:38px">⚠</div><h3>Chưa gửi được đơn</h3>'+
        '<p style="font-size:14px;line-height:1.6;color:#5e5853">Đơn của bạn <b>chưa được ghi nhận</b> do lỗi kết nối. Giỏ hàng vẫn còn nguyên — bạn thử lại giúp mình, hoặc nhắn trực tiếp để Puvela chốt đơn tay.</p>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:16px 0">'+
          '<a class="pv-btn" style="text-decoration:none" href="https://zalo.me/'+LIENHE.zalo+'?text='+tin+'" target="_blank" rel="noopener">Nhắn Zalo đặt đơn</a>'+
          '<a class="pv-btn" style="text-decoration:none;background:transparent;color:inherit;border:1px solid currentColor" href="tel:'+LIENHE.hotline+'">Gọi '+LIENHE.hotline+'</a>'+
        '</div>'+
        '<p style="font-size:12px;color:#7a7268">Lý do kỹ thuật: '+String(loi).replace(/[<>]/g,'')+'</p>'+
        '<button class="pv-btn" data-doneclose style="margin-top:14px;background:transparent;color:inherit;border:1px solid currentColor">Quay lại giỏ hàng</button>';
      showView("done");
      d.querySelector("[data-doneclose]").onclick = function(){ showView("cart"); };
      return;
    }

    clear();
    d.innerHTML = '<div style="font-size:38px">✓</div><h3>Cảm ơn bạn!</h3>'+
      '<p style="font-size:14px;line-height:1.6;color:#5e5853">Đơn của bạn đã được ghi nhận. Puvela sẽ gọi điện/nhắn tin xác nhận trong thời gian sớm nhất.</p>'+
      '<div class="code">Mã đơn: '+order.code+'</div>'+
      '<p style="font-size:13px;color:#5e5853">Tổng thanh toán: <b>'+money(tot)+'</b> · '+(order.payment_method==="cod"?"Thanh toán khi nhận hàng":"Chuyển khoản")+'</p>'+
      (order.payment_method==="bank"?'<div class="pv-bank" style="text-align:left;margin-top:14px">Chuyển khoản tới:<br><b>'+BANK.bank+'</b> · '+BANK.stk+'<br>'+BANK.ten+'<br>Nội dung: <b>'+order.code+'</b></div>':'')+
      '<button class="pv-btn" data-doneclose style="margin-top:22px">Tiếp tục mua sắm</button>';
    showView("done");
    d.querySelector("[data-doneclose]").onclick = close;
  }

  // ---------- init ----------
  function init(){
    document.querySelectorAll("[data-cart-toggle]").forEach(function(el){
      el.addEventListener("click", function(e){ e.preventDefault(); open(); });
    });
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.puvelaCart = { add:add, open:open, close:close, count:function(){return count();} };
})();
