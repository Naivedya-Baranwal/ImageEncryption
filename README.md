# 🔐 StegnoEncryption - Secure Data Hiding System

A full-stack web application that combines **steganography** and **cryptography** to securely hide encrypted data inside images using advanced LSB (Least Significant Bit) encoding with AES-GCM encryption.

### Tech Stack
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?style=flat&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18.20.0-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.18.2-000000?style=flat&logo=express&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat&logo=python&logoColor=white)
![OpenCV](https://img.shields.io/badge/OpenCV-4.8.1-5C3EE8?style=flat&logo=opencv&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.17-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![AES-256](https://img.shields.io/badge/Encryption-AES--256--GCM-FF6B35?style=flat&logo=securityshields.io/badge/Key%20Derivation-PBKDF2--SHA256-4CAF50?style=flat&logo=white)
![LSB Steganography](https://img.shields.io/badge/Steganography-LSB%20Encoding-9C27B0?style=flat&logo/badge/Deployed%20on-Render-46)

## ✨ Features

### 🔒 Security
- **AES-256-GCM Encryption**: Military-grade encryption with authenticated encryption
- **PBKDF2 Key Derivation**: 200,000 iterations with SHA-256 for password-based encryption
- **LSB Steganography**: Invisible data embedding in image pixels with zero visual degradation
- **Automatic File Cleanup**: Secure temporary file deletion after each operation

### 🖼️ Image Support
- **Input**: PNG, JPG, JPEG formats
- **Output**: Always PNG for maximum compatibility
- **Zero Visual Impact**: No detectable changes to image appearance
- **Capacity**: Supports embedding up to image dimensions × 3 (RGB channels) bits

### 🌐 Web Interface
- **Drag & Drop Upload**: Intuitive file selection
- **Real-time Processing**: Live feedback and error handling
- **Responsive Design**: Works on desktop and mobile devices
- **Toast Notifications**: Clear success/error messages

## 🏗️ Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React.js      │    │   Express.js    │    │   Python CLI    │
│   Frontend      │◄──►│   Backend       │◄──►│   Crypto Engine │
│   (TypeScript)  │    │   (TypeScript)  │    │   (OpenCV)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```


## 📁 Project Structure

```
STEGANOGRAPHY/
├── backend/
│   ├── src/
│   │   ├── controllers/     # API request handlers
│   │   ├── middleware/      # File upload & CORS
│   │   ├── routes/          # API endpoints
│   │   ├── utils/           # Python runner & cleanup
│   │   └── index.ts         # Server entry point
│   ├── py_scripts/
│   │   └── stego_aes_lsb_cli.py  # Core encryption logic
│   └── tmp/                 # Temporary files (auto-cleaned)
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   └── main.tsx         # App entry point
│   └── dist/               # Built assets
└── README.md
```

## 🔧 Technical Details

### Cryptographic Implementation
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2 with SHA-256, 200,000 iterations
- **Salt**: 128-bit cryptographically secure random bytes
- **Nonce**: 96-bit cryptographically secure random bytes
- **Authentication**: Built-in MAC verification prevents tampering

### Steganographic Method
- **Technique**: LSB (Least Significant Bit) modification
- **Channel**: RGB pixel values in PNG images
- **Capacity**: ~3 bits per pixel (1 bit per RGB channel)
- **Header**: 32-bit length prefix for data extraction
- **Visual Impact**: Mathematically imperceptible changes

## 🛡️ Security Considerations

- All temporary files are securely deleted after processing
- No sensitive data persists on server filesystem
- CORS configured for trusted origins only
- Input validation prevents malicious file uploads
- Memory-safe operations prevent data leakage

## 🚨 Known Limitations

- Maximum message size limited by image dimensions
- Requires lossless image formats for reliable extraction
- Python dependencies must be installed on deployment server
- Processing time scales with image size and message length

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
