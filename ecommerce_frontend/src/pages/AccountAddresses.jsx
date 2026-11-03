import { useEffect, useState } from 'react';
import axios from 'axios';
import './AccountAddresses.css';

const CITIES = [
  'İstanbul','Ankara','İzmir','Bursa','Antalya',
  'Adana','Konya','Kocaeli','Gaziantep','Mersin'
];

export default function AccountAddresses() {
  const token = localStorage.getItem('token');

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [address, setAddress] = useState(null); 
  const [msg, setMsg] = useState(null);

  const [form, setForm] = useState({
    invoice_type: 'bireysel',
    city: '',
    address_text: ''
  });

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          'http://localhost:5000/addresses',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (cancelled) return;

        setUsername(res.data?.username || '');
        if (res.data?.address) {
          setAddress(res.data.address);
          setForm({
            invoice_type: res.data.address.invoice_type || 'bireysel',
            city: res.data.address.city || '',
            address_text: res.data.address.address_text || ''
          });
        } else {
          setAddress(null);
          setForm({ invoice_type: 'bireysel', city: '', address_text: '' });
        }
      } catch (e) {
        setMsg(e?.response?.data?.error || 'Adres bilgileri yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };
  fetchData();
    return () => { cancelled = true; };
  }, [token]);



  const startEdit = () => setEditing(true);

  const cancelEdit = () => {
    setEditing(false);
    if (address) {
      setForm({
        invoice_type: address.invoice_type || 'bireysel',
        city: address.city || '',
        address_text: address.address_text || ''
      });
    } else {
      setForm({ invoice_type: 'bireysel', city: '', address_text: '' });
    }
    setMsg(null);
  };

  const saveAddress = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await axios.put(
        'http://localhost:5000/addresses',
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg(res.data?.message || 'Adres kaydedildi.');
      setAddress({
        id: address?.id ?? 0,
        invoice_type: form.invoice_type,
        city: form.city,
        address_text: form.address_text
      });
      setEditing(false);
    } catch (e2) {
      setMsg(e2?.response?.data?.error || 'Adres güncellenemedi.');
    }
  };


  const handleDelete = async () => {
    if (!window.confirm('Kaydı silmek istiyor musunuz?')) return;
    setMsg(null);
    try {
      await axios.delete(
        'http://localhost:5000/addresses',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg('Adres silindi.');
      setAddress(null);
      setEditing(false);
      setForm({ invoice_type: 'bireysel', city: '', address_text: '' });
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Adres silinemedi.');
    }
  };

  if (loading) return <div className="addr-wrap">Yükleniyor…</div>;

  return (
    <div className="addr-wrap">
      <h1>Adres Bilgilerim</h1>
      <p className="sub">Adresinizi bu sayfadan güncelleyebilirsiniz.</p>

      {msg && <div className="alert">{msg}</div>}

      {!editing && (
        <div className="card">
          {address ? (
            <>
              <div className="addr-header">
                {/* Başta*/}
                <div className="title" />
                <div className="actions">
                  <button className="btn ghost" onClick={startEdit}>Düzenle</button>
                  {/* Sil butonu */}
                  <button className="btn ghost" onClick={handleDelete}>Sil</button>
                </div>
              </div>

              <div className="addr-body">
                <div className="row">
                  <span className="label">Fatura Türü:</span>{' '}
                  {address.invoice_type === 'kurumsal' ? 'Kurumsal Adres' : 'Bireysel Adres'}
                </div>

                <div className="row">
                  <span className="label">Kullanıcı Adı:</span> {username}
                </div>

                <div className="row">
                  <span className="label">Açık Adres:</span> {address.address_text}
                </div>

                <div className="row">
                  <span className="label">Şehir:</span> {address.city}
                </div>
              </div>
            </>
          ) : (
            <div className="empty">
              <p>Hiç adres girilmemiş. Lütfen adres bilgilerinizi giriniz.</p>
              <button className="btn" onClick={startEdit}>Adres Ekle</button>
            </div>
          )}
        </div>
      )}

      {editing && (
        <form className="card" onSubmit={saveAddress}>
          <div className="grid-2">
            <div>
              <label>Fatura Türü</label>
              <div className="radio-group">
                <label className="radio">
                  <input
                    type="radio"
                    name="invoice_type"
                    checked={form.invoice_type === 'bireysel'}
                    onChange={() => setForm(f => ({ ...f, invoice_type: 'bireysel' }))}
                  />
                  Bireysel Adres
                </label>
                <label className="radio">
                  <input
                    type="radio"
                    name="invoice_type"
                    checked={form.invoice_type === 'kurumsal'}
                    onChange={() => setForm(f => ({ ...f, invoice_type: 'kurumsal' }))}
                  />
                  Kurumsal Adres
                </label>
              </div>

              <label>Kullanıcı Adı</label>
              <input type="text" value={username} readOnly />
            </div>

            <div>
              <label>Şehir Seçiniz</label>
              <select
                value={form.city}
                onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
                required
              >
                <option value="">Seçiniz</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <label>Açık Adres</label>
          <textarea
            rows={4}
            value={form.address_text}
            onChange={(e) => setForm(f => ({ ...f, address_text: e.target.value }))}
            placeholder="Mahalle, cadde/sokak, bina/daire no, ilçe, posta kodu…"
            required
          />

          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={cancelEdit}>Vazgeç</button>
            {/* Düzenleme modunda  Sil butonu */}
            <button type="button" className="btn ghost" onClick={handleDelete}>Sil</button>
            <button type="submit" className="btn">Güncelle</button>
          </div>
        </form>
      )}
    </div>
  );
}