// backend/seoGenerator.js

function generateSEO(video) {
  const title = video.title || video.description?.slice(0, 50) || "XStream Video";
  const description = video.description || `Watch "${title}" on XStream.`;

  // Generate simple keywords: split title + category
  const keywords = [
    ...(title?.split(" ") || []),
    ...(video.category ? [video.category] : []),
  ].map(k => k.toLowerCase());

  // Open Graph data
  const og = {
    ogTitle: title,
    ogDescription: description,
    ogImage: video.thumbnail || "",
    ogVideo: video.url || "",
  };

  // JSON-LD VideoObject
  const jsonLD = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": title,
    "description": description,
    "thumbnailUrl": video.thumbnail || "",
    "uploadDate": video.uploadDate || new Date().toISOString(),
    "contentUrl": video.url || "",
    "embedUrl": video.url || "",
  };

  return { title, description, keywords, og, jsonLD };
}

module.exports = generateSEO;
