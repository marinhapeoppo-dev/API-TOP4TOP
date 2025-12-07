import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';

// Import top4top function as ES module
async function top4top(file) {
  const FormData = (await import('form-data')).default;
  const axios = (await import('axios')).default;
  
  const form = new FormData();
  form.append('file_0_', fs.createReadStream(file), path.basename(file));
  form.append('submitr', '[ رفع الملفات ]');

  const html = await axios.post(
    'https://top4top.io/index.php',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
        'Accept': 'text/html'
      }
    }
  ).then(x => x.data).catch(() => null);

  if (!html) return { status: 'error' };

  const get = re => {
    const m = html.match(re);
    return m ? m[1] || m[0] : null;
  };

  const result = get(/value="(https:\/\/[a-z]\.top4top\.io\/[a-zA-Z0-9]+_[a-zA-Z0-9]+\.[a-zA-Z0-9]{2,5})"/)
              || get(/https:\/\/[a-z]\.top4top\.io\/[a-zA-Z0-9]+_[a-zA-Z0-9]+\.[a-zA-Z0-9]{2,5}/)
              || get(/value="(https:\/\/[a-z]\.top4top\.io\/[^"]+)"/)
              || get(/https:\/\/[a-z]\.top4top\.io\/[^"<> ]+/);

  const del = get(/value="(https:\/\/top4top\.io\/del[^"]+)"/)
           || get(/https:\/\/top4top\.io\/del[^"<> ]+/);

  return {
    result: result,
    delete: del
  };
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const form = new IncomingForm();
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    if (!files.file_0_) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = files.file_0_[0];
    const tempPath = file.filepath;
    
    // Upload to top4top
    const result = await top4top(tempPath);
    
    // Clean up temp file
    await fs.unlink(tempPath);
    
    if (!result.result) {
      return res.status(500).json({ error: 'Failed to upload to top4top' });
    }
    
    res.status(200).json({
      success: true,
      result: result.result,
      delete: result.delete
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
                                                                  }
