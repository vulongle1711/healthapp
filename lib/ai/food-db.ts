/**
 * Small built-in reference table used by the offline estimator, and as
 * grounding hints for the AI prompt. Values are typical per-serving
 * estimates (USDA FoodData Central / Vietnamese NIN tables / common
 * street-food portions in HCMC) — not lab measurements.
 *
 * Later a full food database (USDA, Open Food Facts, a Vietnamese DB)
 * can implement the same `FoodRef` shape.
 */
export interface FoodRef {
  name: string;
  aliases: string[]; // diacritic-free, lowercase
  emoji: string;
  unit: string; // default serving, singular
  grams?: number; // approx grams per serving (for "200g ..." inputs)
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "low" | "medium" | "high";
  assumption: string;
  /** If true, a bare number means count of pieces (e.g. 2 gỏi cuốn). */
  countable?: boolean;
}

export const FOOD_DB: FoodRef[] = [
  // ── Vietnamese noodle soups & noodles
  { name: "Phở bò", aliases: ["pho bo", "beef pho", "pho tai", "pho chin", "pho tai nam", "pho dac biet", "pho", "pho bo tai"], emoji: "🍜", unit: "bowl", grams: 650, calories: 480, protein_g: 28, carbs_g: 60, fat_g: 13, confidence: "medium", assumption: "Regular bowl (~650 g with broth): ~200 g rice noodles, ~80 g beef" },
  { name: "Phở gà", aliases: ["pho ga", "chicken pho"], emoji: "🍜", unit: "bowl", grams: 650, calories: 420, protein_g: 28, carbs_g: 58, fat_g: 8, confidence: "medium", assumption: "Regular bowl with ~80 g chicken" },
  { name: "Bún bò Huế", aliases: ["bun bo hue", "bun bo"], emoji: "🍜", unit: "bowl", grams: 700, calories: 560, protein_g: 30, carbs_g: 65, fat_g: 18, confidence: "medium", assumption: "Regular bowl with beef shank and pork" },
  { name: "Bún thịt nướng", aliases: ["bun thit nuong", "grilled pork vermicelli", "bun thit nuong cha gio"], emoji: "🥗", unit: "bowl", grams: 450, calories: 600, protein_g: 26, carbs_g: 75, fat_g: 21, confidence: "medium", assumption: "Vermicelli bowl with ~100 g grilled pork and fish sauce" },
  { name: "Bún chả", aliases: ["bun cha"], emoji: "🥢", unit: "portion", grams: 450, calories: 620, protein_g: 30, carbs_g: 70, fat_g: 24, confidence: "medium", assumption: "Hanoi-style, ~120 g pork patties + vermicelli" },
  { name: "Bún riêu", aliases: ["bun rieu"], emoji: "🍜", unit: "bowl", grams: 650, calories: 450, protein_g: 22, carbs_g: 60, fat_g: 13, confidence: "medium", assumption: "Regular bowl with crab paste and tofu" },
  { name: "Hủ tiếu", aliases: ["hu tieu", "hu tieu nam vang", "hu tieu go"], emoji: "🍜", unit: "bowl", grams: 600, calories: 520, protein_g: 26, carbs_g: 68, fat_g: 15, confidence: "medium", assumption: "Regular bowl with pork, shrimp and liver" },
  { name: "Mì Quảng", aliases: ["mi quang"], emoji: "🍜", unit: "bowl", grams: 450, calories: 550, protein_g: 28, carbs_g: 65, fat_g: 19, confidence: "medium", assumption: "Regular bowl with pork, shrimp, egg and peanuts" },
  { name: "Mì gói", aliases: ["mi goi", "mi tom", "instant noodles", "ramen goi", "mi hao hao"], emoji: "🍜", unit: "pack", grams: 75, calories: 350, protein_g: 7, carbs_g: 48, fat_g: 14, confidence: "high", assumption: "One 75 g pack prepared with seasoning" },

  // ── Rice dishes
  { name: "Cơm tấm sườn bì chả", aliases: ["com tam suon bi cha", "com tam dac biet", "com tam suon bi"], emoji: "🍚", unit: "plate", grams: 450, calories: 750, protein_g: 35, carbs_g: 90, fat_g: 26, confidence: "medium", assumption: "~200 g broken rice, grilled pork chop, shredded pork skin, egg meatloaf" },
  { name: "Cơm tấm sườn", aliases: ["com tam suon", "com tam", "broken rice"], emoji: "🍚", unit: "plate", grams: 380, calories: 650, protein_g: 32, carbs_g: 85, fat_g: 20, confidence: "medium", assumption: "~200 g broken rice + one grilled pork chop" },
  { name: "Cơm gà", aliases: ["com ga", "chicken rice", "com ga xoi mo", "hainanese chicken rice"], emoji: "🍗", unit: "plate", grams: 400, calories: 620, protein_g: 35, carbs_g: 75, fat_g: 18, confidence: "medium", assumption: "~200 g rice + ~120 g chicken" },
  { name: "Cơm chiên", aliases: ["com chien", "fried rice", "com chien duong chau"], emoji: "🍳", unit: "plate", grams: 350, calories: 650, protein_g: 18, carbs_g: 85, fat_g: 25, confidence: "medium", assumption: "Restaurant plate, ~350 g" },
  { name: "Cơm trắng", aliases: ["com trang", "com", "white rice", "rice", "steamed rice"], emoji: "🍚", unit: "bowl", grams: 150, calories: 200, protein_g: 4, carbs_g: 44, fat_g: 0.4, confidence: "medium", assumption: "One Vietnamese rice bowl (chén) ≈ 150 g cooked rice" },
  { name: "Xôi gà", aliases: ["xoi ga"], emoji: "🍙", unit: "portion", grams: 300, calories: 520, protein_g: 20, carbs_g: 78, fat_g: 14, confidence: "medium", assumption: "Sticky rice ~200 g with shredded chicken and fried shallots" },
  { name: "Xôi", aliases: ["xoi", "xoi man", "sticky rice"], emoji: "🍙", unit: "portion", grams: 250, calories: 450, protein_g: 12, carbs_g: 75, fat_g: 11, confidence: "low", assumption: "Street portion ~250 g with toppings" },

  // ── Bánh
  { name: "Bánh mì thịt", aliases: ["banh mi thit", "banh mi", "banh mi pate", "pork banh mi", "vietnamese banh mi", "banh mi with pork", "vietnamese banh mi with pork", "banh mi thap cam", "banh mi heo quay", "banh mi xiu mai"], emoji: "🥖", unit: "sandwich", grams: 220, calories: 500, protein_g: 21, carbs_g: 60, fat_g: 19, confidence: "medium", assumption: "Standard street banh mi ~200–220 g with pâté, cold cuts and pickles" },
  { name: "Bánh mì ốp la", aliases: ["banh mi op la", "banh mi trung", "banh mi chao"], emoji: "🥖", unit: "sandwich", grams: 200, calories: 430, protein_g: 16, carbs_g: 50, fat_g: 18, confidence: "medium", assumption: "Baguette with 2 fried eggs" },
  { name: "Bánh cuốn", aliases: ["banh cuon"], emoji: "🥟", unit: "plate", grams: 350, calories: 400, protein_g: 14, carbs_g: 62, fat_g: 10, confidence: "medium", assumption: "One plate with chả lụa and fish sauce" },
  { name: "Bánh xèo", aliases: ["banh xeo"], emoji: "🥞", unit: "pancake", grams: 250, calories: 450, protein_g: 14, carbs_g: 40, fat_g: 26, confidence: "low", assumption: "One large southern-style pancake, pan-fried", countable: true },
  { name: "Bánh bao", aliases: ["banh bao", "steamed bun"], emoji: "🥟", unit: "bun", grams: 150, calories: 300, protein_g: 10, carbs_g: 45, fat_g: 8, confidence: "medium", assumption: "One medium bun with pork and quail egg", countable: true },
  { name: "Gỏi cuốn", aliases: ["goi cuon", "spring roll", "spring rolls", "fresh spring roll", "fresh spring rolls", "summer roll", "summer rolls"], emoji: "🥬", unit: "roll", grams: 80, calories: 90, protein_g: 5, carbs_g: 13, fat_g: 1.8, confidence: "medium", assumption: "One fresh roll with shrimp, pork and vermicelli (sauce not included)", countable: true },
  { name: "Chả giò", aliases: ["cha gio", "nem ran", "fried spring roll", "fried spring rolls", "egg roll", "egg rolls"], emoji: "🌯", unit: "roll", grams: 40, calories: 110, protein_g: 4, carbs_g: 8, fat_g: 7, confidence: "medium", assumption: "One fried roll ~40 g", countable: true },

  // ── Mains / sides
  { name: "Thịt kho trứng", aliases: ["thit kho trung", "thit kho", "caramelized pork and eggs"], emoji: "🥘", unit: "portion", grams: 200, calories: 420, protein_g: 26, carbs_g: 8, fat_g: 31, confidence: "medium", assumption: "~100 g pork belly + 1 egg in caramel sauce" },
  { name: "Cá kho", aliases: ["ca kho", "ca kho to", "braised fish", "caramelized fish"], emoji: "🐟", unit: "portion", grams: 150, calories: 280, protein_g: 28, carbs_g: 10, fat_g: 14, confidence: "medium", assumption: "~150 g braised fish with sauce" },
  { name: "Canh rau", aliases: ["canh", "canh rau", "soup", "vegetable soup", "canh chua"], emoji: "🥣", unit: "bowl", grams: 250, calories: 60, protein_g: 3, carbs_g: 7, fat_g: 2, confidence: "medium", assumption: "One small bowl of clear vegetable soup" },
  { name: "Rau xào", aliases: ["rau xao", "rau muong xao", "rau muong xao toi", "stir fried vegetables", "stir-fried vegetables", "vegetables", "veggies", "rau"], emoji: "🥦", unit: "portion", grams: 150, calories: 100, protein_g: 3, carbs_g: 9, fat_g: 6, confidence: "medium", assumption: "~150 g vegetables stir-fried with ~1 tsp oil" },
  { name: "Grilled chicken breast", aliases: ["grilled chicken breast", "chicken breast", "uc ga", "uc ga nuong", "grilled chicken"], emoji: "🍗", unit: "portion", grams: 150, calories: 250, protein_g: 46, carbs_g: 0, fat_g: 5.5, confidence: "medium", assumption: "~150 g cooked skinless breast" },
  { name: "Sườn nướng", aliases: ["suon nuong", "grilled pork chop", "pork chop"], emoji: "🍖", unit: "piece", grams: 120, calories: 320, protein_g: 25, carbs_g: 6, fat_g: 22, confidence: "medium", assumption: "One marinated pork chop ~120 g", countable: true },
  { name: "Salmon", aliases: ["salmon", "ca hoi", "salmon fillet"], emoji: "🐟", unit: "fillet", grams: 150, calories: 310, protein_g: 33, carbs_g: 0, fat_g: 19, confidence: "medium", assumption: "~150 g cooked fillet" },
  { name: "Beef steak", aliases: ["steak", "beef steak", "bo bit tet", "bit tet"], emoji: "🥩", unit: "portion", grams: 200, calories: 450, protein_g: 50, carbs_g: 0, fat_g: 27, confidence: "medium", assumption: "~200 g cooked sirloin" },
  { name: "Đậu hũ", aliases: ["dau hu", "dau phu", "tofu", "dau hu chien"], emoji: "🧈", unit: "portion", grams: 150, calories: 180, protein_g: 15, carbs_g: 4, fat_g: 11, confidence: "medium", assumption: "~150 g tofu, lightly fried" },
  { name: "Egg", aliases: ["egg", "eggs", "trung", "trung ga", "boiled egg", "boiled eggs", "trung luoc"], emoji: "🥚", unit: "egg", grams: 50, calories: 72, protein_g: 6.3, carbs_g: 0.4, fat_g: 4.8, confidence: "high", assumption: "Large egg (~50 g)", countable: true },
  { name: "Fried egg", aliases: ["fried egg", "fried eggs", "trung chien", "trung op la", "op la"], emoji: "🍳", unit: "egg", grams: 50, calories: 90, protein_g: 6.3, carbs_g: 0.4, fat_g: 7, confidence: "high", assumption: "Large egg fried in ~1 tsp oil", countable: true },
  { name: "Salad", aliases: ["salad", "green salad", "rau tron"], emoji: "🥗", unit: "bowl", grams: 200, calories: 150, protein_g: 4, carbs_g: 12, fat_g: 10, confidence: "low", assumption: "Mixed greens with ~1 tbsp dressing" },
  { name: "Pizza", aliases: ["pizza", "pizza slice", "slice of pizza", "slices of pizza"], emoji: "🍕", unit: "slice", grams: 107, calories: 285, protein_g: 12, carbs_g: 36, fat_g: 10, confidence: "medium", assumption: "One slice of a 14\" cheese pizza", countable: true },
  { name: "Burger", aliases: ["burger", "hamburger", "cheeseburger"], emoji: "🍔", unit: "burger", grams: 220, calories: 520, protein_g: 28, carbs_g: 40, fat_g: 27, confidence: "medium", assumption: "Single-patty restaurant burger", countable: true },
  { name: "Toast", aliases: ["toast", "bread", "banh mi sandwich", "whole wheat toast", "slice of bread", "slices of bread"], emoji: "🍞", unit: "slice", grams: 32, calories: 80, protein_g: 3.5, carbs_g: 14, fat_g: 1.2, confidence: "high", assumption: "One slice whole-wheat bread", countable: true },
  { name: "Oatmeal", aliases: ["oatmeal", "oats", "yen mach", "chao yen mach"], emoji: "🥣", unit: "bowl", grams: 40, calories: 160, protein_g: 6, carbs_g: 27, fat_g: 3, confidence: "medium", assumption: "40 g dry oats cooked with water" },
  { name: "Cháo", aliases: ["chao", "porridge", "congee", "chao ga", "chao long"], emoji: "🥣", unit: "bowl", grams: 400, calories: 300, protein_g: 15, carbs_g: 40, fat_g: 8, confidence: "low", assumption: "Regular bowl of rice porridge with meat" },

  // ── Fruit & snacks
  { name: "Banana", aliases: ["banana", "bananas", "chuoi", "qua chuoi", "trai chuoi"], emoji: "🍌", unit: "banana", grams: 118, calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.4, confidence: "high", assumption: "One medium banana (~118 g)", countable: true },
  { name: "Apple", aliases: ["apple", "apples", "qua tao", "trai tao"], emoji: "🍎", unit: "apple", grams: 180, calories: 95, protein_g: 0.5, carbs_g: 25, fat_g: 0.3, confidence: "high", assumption: "One medium apple", countable: true },
  { name: "Mango", aliases: ["mango", "xoai"], emoji: "🥭", unit: "mango", grams: 200, calories: 120, protein_g: 1.6, carbs_g: 30, fat_g: 0.8, confidence: "medium", assumption: "Flesh of one medium mango (~200 g)", countable: true },
  { name: "Greek yogurt", aliases: ["greek yogurt", "sua chua hy lap"], emoji: "🥛", unit: "cup", grams: 170, calories: 150, protein_g: 17, carbs_g: 8, fat_g: 4, confidence: "high", assumption: "170 g low-fat plain" },
  { name: "Yogurt", aliases: ["yogurt", "sua chua", "yaourt", "da ua"], emoji: "🥛", unit: "cup", grams: 100, calories: 100, protein_g: 3.5, carbs_g: 15, fat_g: 3, confidence: "high", assumption: "One 100 g sweetened Vietnamese yogurt", countable: true },
  { name: "Chè", aliases: ["che", "che ba mau", "che dau"], emoji: "🍧", unit: "cup", grams: 300, calories: 280, protein_g: 5, carbs_g: 55, fat_g: 5, confidence: "low", assumption: "One cup of sweet bean dessert with coconut milk" },
  { name: "Protein shake", aliases: ["protein shake", "whey", "whey protein", "protein"], emoji: "🥤", unit: "scoop", grams: 30, calories: 130, protein_g: 25, carbs_g: 4, fat_g: 2, confidence: "high", assumption: "One 30 g scoop mixed with water", countable: true },

  // ── Drinks
  { name: "Cà phê sữa đá", aliases: ["ca phe sua da", "ca phe sua", "cafe sua da", "cafe sua", "iced milk coffee", "vietnamese iced milk coffee", "vietnamese iced coffee", "iced coffee with milk", "milk coffee"], emoji: "☕", unit: "glass", grams: 200, calories: 160, protein_g: 3, carbs_g: 25, fat_g: 5, confidence: "medium", assumption: "Standard glass with ~2 tbsp sweetened condensed milk" },
  { name: "Bạc xỉu", aliases: ["bac xiu"], emoji: "☕", unit: "glass", grams: 250, calories: 200, protein_g: 4, carbs_g: 30, fat_g: 7, confidence: "medium", assumption: "Milk-heavy coffee with condensed milk" },
  { name: "Cà phê đen", aliases: ["ca phe den", "cafe den", "ca phe den da", "black coffee", "espresso", "americano", "coffee"], emoji: "☕", unit: "glass", grams: 150, calories: 35, protein_g: 0.3, carbs_g: 8, fat_g: 0, confidence: "medium", assumption: "Black coffee with ~2 tsp sugar (0 kcal if unsweetened)" },
  { name: "Trà sữa trân châu", aliases: ["tra sua", "tra sua tran chau", "milk tea", "bubble tea", "boba"], emoji: "🧋", unit: "cup", grams: 500, calories: 380, protein_g: 4, carbs_g: 65, fat_g: 11, confidence: "low", assumption: "500 ml, 100% sugar, with tapioca pearls" },
  { name: "Nước ép cam", aliases: ["nuoc ep cam", "nuoc cam", "orange juice", "cam vat"], emoji: "🍊", unit: "glass", grams: 300, calories: 140, protein_g: 2, carbs_g: 33, fat_g: 0.5, confidence: "medium", assumption: "300 ml fresh juice, no added sugar" },
  { name: "Nước ép", aliases: ["nuoc ep", "juice", "fruit juice", "nuoc ep trai cay"], emoji: "🧃", unit: "glass", grams: 300, calories: 150, protein_g: 1.5, carbs_g: 35, fat_g: 0.5, confidence: "low", assumption: "300 ml mixed fruit juice" },
  { name: "Sinh tố bơ", aliases: ["sinh to bo", "avocado smoothie"], emoji: "🥑", unit: "glass", grams: 400, calories: 380, protein_g: 5, carbs_g: 45, fat_g: 20, confidence: "low", assumption: "400 ml with condensed milk" },
  { name: "Sinh tố", aliases: ["sinh to", "smoothie"], emoji: "🥤", unit: "glass", grams: 400, calories: 250, protein_g: 4, carbs_g: 50, fat_g: 4, confidence: "low", assumption: "400 ml fruit smoothie with sugar/milk" },
  { name: "Nước mía", aliases: ["nuoc mia", "sugarcane juice"], emoji: "🥤", unit: "glass", grams: 400, calories: 180, protein_g: 0, carbs_g: 45, fat_g: 0, confidence: "medium", assumption: "400 ml glass" },
  { name: "Soft drink", aliases: ["coke", "coca", "coca cola", "pepsi", "nuoc ngot", "soda", "7up", "sprite"], emoji: "🥤", unit: "can", grams: 330, calories: 140, protein_g: 0, carbs_g: 39, fat_g: 0, confidence: "high", assumption: "330 ml can, regular (not diet)", countable: true },
  { name: "Milk", aliases: ["milk", "sua tuoi", "sua", "hop sua"], emoji: "🥛", unit: "glass", grams: 250, calories: 150, protein_g: 8, carbs_g: 12, fat_g: 8, confidence: "high", assumption: "250 ml whole milk" },
  { name: "Beer", aliases: ["beer", "beers", "bia", "bia lon", "bia saigon", "bia tiger", "bia 333", "bia heineken", "lon bia"], emoji: "🍺", unit: "can", grams: 330, calories: 145, protein_g: 1, carbs_g: 11, fat_g: 0, confidence: "high", assumption: "330 ml can of regular lager (~5% ABV; alcohol supplies most calories)", countable: true },
];

/** Aliases sorted longest-first so "com tam suon bi cha" beats "com tam" beats "com". */
export const ALIAS_INDEX: { alias: string; ref: FoodRef }[] = FOOD_DB.flatMap((ref) =>
  ref.aliases.map((alias) => ({ alias, ref })),
).sort((a, b) => b.alias.length - a.alias.length);
