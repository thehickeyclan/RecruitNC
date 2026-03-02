export interface Review {
  id: number
  userName: string
  rating: number
  verified: boolean
  date: string
  title: string
  content: string
  helpfulCount: number
}

export interface ProductDetail {
  sku: string
  reviewCount: number
  description: string
  features: string[]
  colors: Array<{ name: string; hex: string; inStock: boolean }>
  availableSizes: string[]
  stockStatus: "in-stock" | "low-stock" | "out-of-stock"
  images: string[]
  reviews: Review[]
}

export const productDetails: Record<number, ProductDetail> = {
  1: {
    sku: "NCU-TEE-001",
    reviewCount: 23,
    description:
      "Show your North Carolina wrestling pride with this premium cotton t-shirt. Featuring the NC United logo on the chest and 'NC Wrestling' text on the back. Perfect for training, tournaments, or everyday wear.",
    features: [
      "100% premium cotton",
      "Screen-printed graphics",
      "Pre-shrunk fabric",
      "Tagless comfort",
      "Unisex sizing",
    ],
    colors: [
      { name: "Navy Blue", hex: "#1e3a8a", inStock: true },
      { name: "Red", hex: "#dc2626", inStock: true },
      { name: "White", hex: "#ffffff", inStock: true },
      { name: "Athletic Gray", hex: "#9ca3af", inStock: false },
    ],
    availableSizes: ["YS", "YM", "YL", "S", "M", "L", "XL"],
    stockStatus: "in-stock",
    images: [
      "/navy-blue-athletic-t-shirt-front-view-with-nc-unit.jpg",
      "/navy-blue-athletic-t-shirt-back-view-with-nc-wrest.jpg",
      "/navy-blue-athletic-t-shirt-detail-shot-of-logo-pri.jpg",
      "/athlete-wearing-navy-blue-nc-united-t-shirt-at-wre.jpg",
    ],
    reviews: [
      {
        id: 1,
        userName: "Jake M.",
        rating: 5,
        verified: true,
        date: "2 weeks ago",
        title: "Perfect for tournaments!",
        content:
          "Great quality shirt, fits well, and the design looks awesome. Wore it to States and got lots of compliments. Material is comfortable and breathes well.",
        helpfulCount: 12,
      },
      {
        id: 2,
        userName: "Sarah K.",
        rating: 5,
        verified: true,
        date: "1 month ago",
        title: "Love this shirt!",
        content:
          "Bought this for my son and he wears it all the time. The quality is excellent and it has held up great after multiple washes. Highly recommend!",
        helpfulCount: 8,
      },
      {
        id: 3,
        userName: "Coach Mike",
        rating: 4,
        verified: true,
        date: "3 weeks ago",
        title: "Great team spirit wear",
        content:
          "Ordered these for our entire team. Everyone loves them! Only giving 4 stars because I wish there were more color options, but overall very satisfied.",
        helpfulCount: 5,
      },
    ],
  },
  2: {
    sku: "NCU-HOOD-001",
    reviewCount: 18,
    description:
      "Stay warm and show your state pride with this premium wrestling hoodie. Features embroidered NC United logo and 'Wrestling State Pride' text.",
    features: [
      "80% cotton, 20% polyester blend",
      "Embroidered graphics",
      "Kangaroo pocket",
      "Ribbed cuffs and waistband",
      "Unisex sizing",
    ],
    colors: [
      { name: "Navy Blue", hex: "#1e3a8a", inStock: true },
      { name: "Red", hex: "#dc2626", inStock: true },
    ],
    availableSizes: ["S", "M", "L", "XL", "XXL"],
    stockStatus: "in-stock",
    images: [
      "/navy-blue-wrestling-hoodie-front-view.jpg",
      "/navy-blue-wrestling-hoodie-back-view.jpg",
      "/navy-blue-wrestling-hoodie-detail-embroidered-logo.jpg",
      "/athlete-wearing-navy-wrestling-hoodie.jpg",
    ],
    reviews: [
      {
        id: 4,
        userName: "Tom R.",
        rating: 5,
        verified: true,
        date: "1 week ago",
        title: "Best hoodie ever!",
        content: "Super comfortable and warm. The embroidery looks professional and hasn't frayed at all.",
        helpfulCount: 15,
      },
      {
        id: 5,
        userName: "Lisa P.",
        rating: 5,
        verified: true,
        date: "2 weeks ago",
        title: "Perfect fit",
        content: "Ordered a medium and it fits perfectly. Great quality material and the design is sharp.",
        helpfulCount: 9,
      },
      {
        id: 6,
        userName: "David L.",
        rating: 4,
        verified: true,
        date: "1 month ago",
        title: "Great quality",
        content: "Really nice hoodie. Wish it came in more colors but the navy is beautiful.",
        helpfulCount: 6,
      },
    ],
  },
  3: {
    sku: "NCU-PERF-001",
    reviewCount: 15,
    description:
      "High-performance training tee designed for wrestlers. Moisture-wicking fabric keeps you dry during intense workouts.",
    features: [
      "100% polyester performance fabric",
      "Moisture-wicking technology",
      "Lightweight and breathable",
      "Athletic fit",
      "Quick-dry material",
    ],
    colors: [
      { name: "Red", hex: "#dc2626", inStock: true },
      { name: "Navy Blue", hex: "#1e3a8a", inStock: true },
    ],
    availableSizes: ["YM", "YL", "S", "M", "L", "XL"],
    stockStatus: "low-stock",
    images: [
      "/red-performance-athletic-training-shirt.jpg",
      "/red-performance-shirt-back-view.jpg",
      "/red-performance-shirt-fabric-detail.jpg",
      "/wrestler-training-in-red-performance-shirt.jpg",
    ],
    reviews: [
      {
        id: 7,
        userName: "Alex T.",
        rating: 5,
        verified: true,
        date: "3 days ago",
        title: "Perfect for training",
        content: "This shirt is amazing for practice. Stays dry and comfortable even during the toughest workouts.",
        helpfulCount: 10,
      },
      {
        id: 8,
        userName: "Marcus J.",
        rating: 4,
        verified: true,
        date: "1 week ago",
        title: "Great performance shirt",
        content: "Really like this shirt. Fits well and the material is top-notch. Would buy again.",
        helpfulCount: 7,
      },
      {
        id: 9,
        userName: "Emily S.",
        rating: 5,
        verified: true,
        date: "2 weeks ago",
        title: "Excellent quality",
        content: "Bought this for my brother and he loves it. The moisture-wicking really works!",
        helpfulCount: 4,
      },
    ],
  },
  4: {
    sku: "NCU-HAT-001",
    reviewCount: 12,
    description: "Classic snapback hat with embroidered NC United logo. Adjustable fit for maximum comfort.",
    features: [
      "Cotton twill construction",
      "Embroidered front logo",
      "Adjustable snapback closure",
      "Structured 6-panel design",
      "One size fits most",
    ],
    colors: [
      { name: "Navy Blue", hex: "#1e3a8a", inStock: true },
      { name: "Red", hex: "#dc2626", inStock: true },
    ],
    availableSizes: ["S", "M", "L"],
    stockStatus: "in-stock",
    images: [
      "/navy-blue-snapback-hat-front-view-nc-logo.jpg",
      "/navy-blue-snapback-hat-side-view.jpg",
      "/navy-blue-snapback-hat-back-view-adjustable-strap.jpg",
      "/navy-blue-snapback-hat-worn-by-athlete.jpg",
    ],
    reviews: [
      {
        id: 10,
        userName: "Chris B.",
        rating: 5,
        verified: true,
        date: "5 days ago",
        title: "Great hat!",
        content: "Perfect fit and the embroidery looks professional. Wear it all the time.",
        helpfulCount: 8,
      },
      {
        id: 11,
        userName: "Jordan W.",
        rating: 5,
        verified: true,
        date: "2 weeks ago",
        title: "Love it",
        content: "Comfortable and stylish. The adjustable back makes it easy to get the perfect fit.",
        helpfulCount: 5,
      },
      {
        id: 12,
        userName: "Ryan M.",
        rating: 4,
        verified: true,
        date: "3 weeks ago",
        title: "Nice quality",
        content: "Good quality hat. Wish it came in more colors but overall very happy with it.",
        helpfulCount: 3,
      },
    ],
  },
  5: {
    sku: "NCU-MOM-001",
    reviewCount: 20,
    description:
      "Show your support with this Wrestling Mom shirt. Comfortable cotton blend perfect for cheering from the stands.",
    features: [
      "60% cotton, 40% polyester blend",
      "Screen-printed design",
      "Relaxed fit",
      "Pre-shrunk fabric",
      "Women's sizing",
    ],
    colors: [
      { name: "White", hex: "#ffffff", inStock: true },
      { name: "Athletic Gray", hex: "#9ca3af", inStock: true },
    ],
    availableSizes: ["S", "M", "L", "XL"],
    stockStatus: "in-stock",
    images: [
      "/white-wrestling-mom-t-shirt-front-view.jpg",
      "/white-wrestling-mom-t-shirt-back-view.jpg",
      "/wrestling-mom-t-shirt-detail-shot.jpg",
      "/mom-wearing-wrestling-mom-shirt-at-tournament.jpg",
    ],
    reviews: [
      {
        id: 13,
        userName: "Jennifer L.",
        rating: 5,
        verified: true,
        date: "1 week ago",
        title: "Perfect wrestling mom shirt!",
        content: "Love this shirt! Comfortable and the design is perfect. Get compliments every tournament.",
        helpfulCount: 14,
      },
      {
        id: 14,
        userName: "Michelle K.",
        rating: 5,
        verified: true,
        date: "2 weeks ago",
        title: "Great quality",
        content: "Soft material and fits great. Washed it several times and it still looks new.",
        helpfulCount: 11,
      },
      {
        id: 15,
        userName: "Amanda R.",
        rating: 5,
        verified: true,
        date: "1 month ago",
        title: "Love it!",
        content: "Bought one for myself and all the other wrestling moms wanted one too!",
        helpfulCount: 9,
      },
    ],
  },
  6: {
    sku: "NCU-CHAMP-001",
    reviewCount: 16,
    description:
      "Celebrate championship success with this premium hoodie. Features 'State Champion' text and NC United branding.",
    features: [
      "80% cotton, 20% polyester",
      "Embroidered champion text",
      "Fleece-lined interior",
      "Kangaroo pocket",
      "Unisex sizing",
    ],
    colors: [
      { name: "Red", hex: "#dc2626", inStock: true },
      { name: "Navy Blue", hex: "#1e3a8a", inStock: true },
    ],
    availableSizes: ["M", "L", "XL", "XXL"],
    stockStatus: "in-stock",
    images: [
      "/red-state-champion-wrestling-hoodie-front.jpg",
      "/red-state-champion-wrestling-hoodie-back.jpg",
      "/state-champion-hoodie-embroidery-detail.jpg",
      "/athlete-wearing-red-champion-hoodie.jpg",
    ],
    reviews: [
      {
        id: 16,
        userName: "Tyler S.",
        rating: 5,
        verified: true,
        date: "4 days ago",
        title: "Champion quality!",
        content: "This hoodie is amazing! Super comfortable and the embroidery is top-notch.",
        helpfulCount: 13,
      },
      {
        id: 17,
        userName: "Brandon H.",
        rating: 5,
        verified: true,
        date: "1 week ago",
        title: "Perfect championship hoodie",
        content: "Bought this after winning states. Love wearing it to show off our accomplishment!",
        helpfulCount: 10,
      },
      {
        id: 18,
        userName: "Coach Steve",
        rating: 5,
        verified: true,
        date: "2 weeks ago",
        title: "Team favorite",
        content: "Ordered these for our championship team. Everyone loves them!",
        helpfulCount: 8,
      },
    ],
  },
  7: {
    sku: "NCU-COMP-001",
    reviewCount: 14,
    description:
      "Professional-grade compression shirt for serious wrestlers. Provides muscle support and enhances performance.",
    features: [
      "88% polyester, 12% spandex",
      "4-way stretch fabric",
      "Compression fit",
      "Moisture-wicking",
      "Flatlock seams",
    ],
    colors: [
      { name: "Navy Blue", hex: "#1e3a8a", inStock: true },
      { name: "Red", hex: "#dc2626", inStock: false },
    ],
    availableSizes: ["YL", "S", "M", "L", "XL"],
    stockStatus: "in-stock",
    images: [
      "/navy-blue-compression-wrestling-shirt-front.jpg",
      "/navy-blue-compression-wrestling-shirt-back.jpg",
      "/compression-shirt-fabric-detail-stretch.jpg",
      "/wrestler-wearing-navy-compression-shirt-training.jpg",
    ],
    reviews: [
      {
        id: 19,
        userName: "Kevin P.",
        rating: 5,
        verified: true,
        date: "6 days ago",
        title: "Best compression shirt",
        content: "Perfect fit and great compression. Really helps during intense training sessions.",
        helpfulCount: 11,
      },
      {
        id: 20,
        userName: "Nathan G.",
        rating: 4,
        verified: true,
        date: "1 week ago",
        title: "Great quality",
        content: "Really like this shirt. The compression is just right and it stays in place.",
        helpfulCount: 7,
      },
      {
        id: 21,
        userName: "Austin M.",
        rating: 5,
        verified: true,
        date: "2 weeks ago",
        title: "Excellent performance",
        content: "This shirt is perfect for wrestling. Comfortable and provides great support.",
        helpfulCount: 6,
      },
    ],
  },
  8: {
    sku: "NCU-BEAN-001",
    reviewCount: 10,
    description: "Stay warm during cold weather with this cozy NC United beanie. Perfect for winter tournaments.",
    features: [
      "100% acrylic knit",
      "Embroidered logo",
      "Cuffed design",
      "One size fits most",
      "Machine washable",
    ],
    colors: [
      { name: "Navy Blue", hex: "#1e3a8a", inStock: true },
      { name: "Red", hex: "#dc2626", inStock: true },
    ],
    availableSizes: ["S", "M", "L"],
    stockStatus: "in-stock",
    images: [
      "/navy-blue-beanie-with-nc-united-logo.jpg",
      "/navy-blue-beanie-side-view.jpg",
      "/placeholder.svg?height=600&width=600",
      "/placeholder.svg?height=600&width=600",
    ],
    reviews: [
      {
        id: 22,
        userName: "Matt D.",
        rating: 5,
        verified: true,
        date: "3 days ago",
        title: "Warm and comfortable",
        content: "Perfect beanie for cold tournaments. Keeps my head warm and looks great!",
        helpfulCount: 9,
      },
      {
        id: 23,
        userName: "Eric W.",
        rating: 4,
        verified: true,
        date: "1 week ago",
        title: "Nice beanie",
        content: "Good quality and fits well. The embroidery looks professional.",
        helpfulCount: 5,
      },
      {
        id: 24,
        userName: "Jason T.",
        rating: 5,
        verified: true,
        date: "2 weeks ago",
        title: "Great winter hat",
        content: "Love this beanie! Warm, comfortable, and shows my NC United pride.",
        helpfulCount: 4,
      },
    ],
  },
}
