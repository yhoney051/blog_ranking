/** @type {import('next').NextConfig} */
const nextConfig = {
  // Windows 파일 잠금 문제 방지 (Windows Defender 실시간 검사 충돌 우회)
  webpack: (config) => {
    config.output.hashFunction = 'xxhash64'
    return config
  },
};

export default nextConfig;
