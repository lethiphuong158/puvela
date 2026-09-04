window.PUVELA_SUPABASE = {
  url: "https://bekajgoeqyrfrekfplho.supabase.co",
  anonKey: "sb_publishable_pNRT5LdoRlDaGwgg3DsNqA_1JDKQBTL"
};

(function () {
  var cfg = window.PUVELA_SUPABASE || {};
  var configured =
    cfg.url && cfg.url.indexOf("YOUR-") === -1 &&
    cfg.anonKey && cfg.anonKey.indexOf("YOUR-") === -1;

  var client = null;
  if (configured && window.supabase && window.supabase.createClient) {
    client = window.supabase.createClient(cfg.url, cfg.anonKey);
  }

  // Lưu 1 lead. payload: {email?, phone?, source, scent_dna?, note?}
  async function saveLead(payload) {
    if (!client) {
      console.warn("[Puvela] Supabase chưa cấu hình — lead CHƯA được lưu:", payload);
      return { ok: false, reason: "not-configured" };
    }
    try {
      var res = await client.from("leads").insert([payload]);
      if (res.error) {
        console.error("[Puvela] Lỗi lưu lead:", res.error.message);
        return { ok: false, reason: res.error.message };
      }
      return { ok: true };
    } catch (e) {
      console.error("[Puvela] Lỗi mạng khi lưu lead:", e);
      return { ok: false, reason: String(e) };
    }
  }

  window.puvela = Object.assign(window.puvela || {}, {
    client: client,
    configured: configured,
    saveLead: saveLead
  });
})();
