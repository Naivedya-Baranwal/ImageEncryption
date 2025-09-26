import sys, os, argparse
import cv2, struct, secrets
import numpy as np
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# ---------- Crypto helpers ----------
def derive_key(password: str, salt: bytes, iterations: int = 200_000) -> bytes:
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=iterations)
    return kdf.derive(password.encode('utf-8'))

def encrypt_with_password(plaintext: bytes, password: str) -> bytes:
    salt = secrets.token_bytes(16)
    key = derive_key(password, salt)
    aesgcm = AESGCM(key)
    nonce = secrets.token_bytes(12)
    ct = aesgcm.encrypt(nonce, plaintext, associated_data=None)
    return salt + nonce + ct

def decrypt_with_password(blob: bytes, password: str) -> bytes:
    if len(blob) < 28:
        raise ValueError("Cipher blob too short")
    salt = blob[:16]
    nonce = blob[16:28]
    ct = blob[28:]
    key = derive_key(password, salt)
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ct, associated_data=None)

# ---------- Bit helpers ----------
def bytes_to_bitstring(b: bytes) -> str:
    return ''.join(f'{byte:08b}' for byte in b)

def bitstring_to_bytes(s: str) -> bytes:
    return bytes(int(s[i:i+8],2) for i in range(0, len(s), 8))

# ---------- LSB stego ----------
def embed_data_in_image_lsb_np(img_arr: np.ndarray, data: bytes) -> np.ndarray:
    h,w,ch = img_arr.shape
    capacity_bits = h*w*ch
    header = struct.pack(">I", len(data))
    full = header + data
    bits = bytes_to_bitstring(full)
    if len(bits) > capacity_bits:
        raise ValueError("Data too large to fit into image (capacity bits=%d, needed=%d)" % (capacity_bits, len(bits)))
    flat = img_arr.reshape(-1)
    for i, bit in enumerate(bits):
        # Fix: use 0xFE (254) instead of ~1 to clear the least significant bit
        flat[i] = (flat[i] & 0xFE) | int(bit)
    return flat.reshape(h,w,ch)

def extract_data_from_image_lsb_np(img_arr: np.ndarray) -> bytes:
    flat = img_arr.reshape(-1)
    header_bits = ''.join(str(flat[i] & 1) for i in range(32))
    header_bytes = bitstring_to_bytes(header_bits)
    data_len = struct.unpack(">I", header_bytes)[0]
    total_bits_needed = 32 + data_len*8
    if total_bits_needed > flat.size:
        raise ValueError("Image does not contain enough bits for indicated length")
    payload_bits = ''.join(str(flat[i] & 1) for i in range(32, 32 + data_len*8))
    payload = bitstring_to_bytes(payload_bits)
    return payload

# ---------- Helpers for formats ----------
def load_image_force_png(path: str) -> np.ndarray:
    # Read image and return BGR numpy array; if JPG, it's read but we will re-save as PNG when writing.
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"Cannot open image {path}")
    # Ensure the image is in uint8 format
    if img.dtype != np.uint8:
        img = img.astype(np.uint8)
    return img

def save_image_png(img_arr: np.ndarray, out_path: str):
    # ensure PNG output
    if not out_path.lower().endswith(".png"):
        out_path = out_path + ".png"
    cv2.imwrite(out_path, img_arr)
    return out_path

# ---------- CLI ----------
def main():
    parser = argparse.ArgumentParser(description="AES-GCM + LSB Stego CLI")
    parser.add_argument("--mode", choices=["encrypt","decrypt"], required=True)
    parser.add_argument("--in", dest="in_path", required=True)
    parser.add_argument("--out", dest="out_path", required=True)
    parser.add_argument("--password", dest="password", required=False, default=None)
    args = parser.parse_args()

    in_path = args.in_path
    out_path = args.out_path
    password = args.password

    # load image
    img = load_image_force_png(in_path)
    # We always operate on a PNG-format array in memory (cv2 returns pixel bytes)
    if args.mode == "encrypt":
        if password is None:
            print("Error: encryption requires --password", file=sys.stderr)
            sys.exit(2)
        # read bytes from STDIN? here we embed plaintext data passed via a file (we will accept a secondary data path via env)
        # For this CLI we expect the plaintext to be in a separate file with the same name + .data or passed via env var; 
        # but for integration we'll accept a temporary path in environment variable PLAIN_INPUT_FILE
        plain_file = os.environ.get("PLAIN_INPUT_FILE")
        if not plain_file or not os.path.exists(plain_file):
            print("Error: expected plaintext file via env PLAIN_INPUT_FILE", file=sys.stderr)
            sys.exit(3)
        with open(plain_file, "rb") as f:
            plaintext = f.read()
        cipher_blob = encrypt_with_password(plaintext, password)
        # embed into PNG arr
        stego_arr = embed_data_in_image_lsb_np(img.copy(), cipher_blob)
        saved = save_image_png(stego_arr, out_path)
        print(saved)  # print output path to stdout
        sys.exit(0)

    elif args.mode == "decrypt":
        # no password case: if the image is not encrypted, it might contain raw plaintext bytes; but we always expect AES blob
        try:
            payload = extract_data_from_image_lsb_np(img)
        except Exception as e:
            print("ERROR: extraction failed: " + str(e), file=sys.stderr)
            sys.exit(4)
        if password:
            try:
                plaintext = decrypt_with_password(payload, password)
            except Exception as e:
                print("ERROR: decryption failed: " + str(e), file=sys.stderr)
                sys.exit(5)
            # write plaintext to out_path (binary)
            with open(out_path, "wb") as f:
                f.write(plaintext)
            print(out_path)
            sys.exit(0)
        else:
            # try to decrypt without password -> will fail unless payload is raw (not encrypted). We can attempt to detect raw vs encrypted:
            # Heuristic: encrypted blob is unlikely to be valid UTF-8 plain text. We'll attempt decryption with no password and if fails, we dump raw payload.
            try:
                # attempt to decode as UTF-8 (rare for ciphertext)
                maybe_plain = payload.decode('utf-8')
                with open(out_path, "wb") as f:
                    f.write(payload)
                print(out_path)
                sys.exit(0)
            except:
                print("ERROR: image payload appears encrypted or invalid; provide --password to decrypt", file=sys.stderr)
                sys.exit(6)

if __name__ == "__main__":
    main()
