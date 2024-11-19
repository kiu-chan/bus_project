const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'quanly_trambus',
  password: '123456',
  port: 5432,
});

// 1. API lấy danh sách tuyến xe bus
app.get('/api/bus-routes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        x.tram_id,
        x.ten_tram,
        x.toa_do,
        x.trang_thai 
      FROM public.tramxebus x
      ORDER BY x.tram_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Lỗi truy vấn:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// 2. API lấy danh sách tuyến xe
app.get('/api/bus-stations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.tuyen_id,
        t.ten_tuyen,
        t.diem_dau,
        t.diem_cuoi,
        t.thoi_gian_hoat_dong
      FROM public.tuyenxe t
      ORDER BY t.tuyen_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Lỗi truy vấn:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// 3. API lấy danh sách các tuyến bus đi qua một trạm
app.get('/api/station-routes/:tramId', async (req, res) => {
  try {
    const tramId = req.params.tramId;
    const result = await pool.query(`
      SELECT DISTINCT
        tx.tuyen_id,
        tx.ten_tuyen,
        tx.diem_dau,
        tx.diem_cuoi,
        tx.thoi_gian_hoat_dong
      FROM public.tramtuyen tt
      JOIN public.tuyenxe tx ON tt.tuyen_id = tx.tuyen_id
      WHERE tt.tram_id = $1
      ORDER BY tx.tuyen_id
    `, [tramId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy tuyến bus nào đi qua trạm này' });
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error('Lỗi truy vấn:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// 4. API lấy danh sách các trạm mà một tuyến bus đi qua
app.get('/api/route-stations/:tuyenId', async (req, res) => {
  try {
    const tuyenId = req.params.tuyenId;
    const result = await pool.query(`
      SELECT 
        tb.tram_id,
        tb.ten_tram,
        tb.toa_do,
        tb.trang_thai,
        tt.thu_tu_tram
      FROM public.tramtuyen tt
      JOIN public.tramxebus tb ON tt.tram_id = tb.tram_id
      WHERE tt.tuyen_id = $1
      ORDER BY tt.thu_tu_tram
    `, [tuyenId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy trạm nào thuộc tuyến này' });
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Lỗi truy vấn:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại port ${PORT}`);
});