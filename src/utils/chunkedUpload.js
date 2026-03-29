export const chunkedUpload = async (file, chunkSize = 1024 * 1024) => {
  // 1MB chunks
  const chunks = Math.ceil(file.size / chunkSize);
  const uploadedChunks = [];

  for (let i = 0; i < chunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', i);
    formData.append('totalChunks', chunks);
    formData.append('filename', file.name);

    // Upload chunk
    const response = await fetch('/api/upload/chunk', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    uploadedChunks.push(data.chunkId);

    // Report progress
    const progress = ((i + 1) / chunks) * 100;
    if (onProgress) onProgress(progress);
  }

  // Combine chunks
  const combineResponse = await fetch('/api/upload/combine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      chunks: uploadedChunks,
    }),
  });

  return combineResponse.json();
};
