<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds for Galo Kids (1000 Products).
     *
     * @return void
     */
    public function run()
    {
        $images = [
            'https://images.unsplash.com/photo-1519241047957-be31d7379a5d?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1543132220-4bf5292c58a6?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&q=80&w=800',
        ];

        // Fetch dynamic category IDs from database if available, otherwise default to [1, 2, 3, 4]
        $categoryIds = DB::table('categories')->pluck('id')->toArray();
        if (empty($categoryIds)) {
            $categoryIds = [1, 2, 3, 4];
        }

        $colors = ['Blue', 'Pink', 'Green', 'Red', 'Yellow', 'Black', 'White', 'Navy'];
        $sizes = ['S', 'M', 'L', 'XL', '2T', '3T', '4T'];

        $productTemplates = [
            ['en' => 'Casual Kids Tee', 'ku' => 'تیشێرتی کواڵێتی منداڵان', 'ar' => 'تيشيرت أطفال كاجوال'],
            ['en' => 'Comfortable Jeans', 'ku' => 'پانتۆڵی کابۆی ئاسوودە', 'ar' => 'جينز مريح للأطفال'],
            ['en' => 'Warm Winter Jacket', 'ku' => 'چاکەتی گەرمی زستانە', 'ar' => 'سترة شتوية دافئة'],
            ['en' => 'Cute Summer Dress', 'ku' => 'فوستانی ڕەنگینی هاوینە', 'ar' => 'فستان صيفي لطيف'],
            ['en' => 'Cotton Pyjama Set', 'ku' => 'سێتی پیجامەی لۆکە', 'ar' => 'طقم بيجامة قطني'],
            ['en' => 'Sporty Hoodie & Joggers', 'ku' => 'سێتی هودی و وەرزشی', 'ar' => 'هودي وبنطال رياضي'],
            ['en' => 'Soft Wool Sweater', 'ku' => 'سوێتەری خوری نەرم', 'ar' => 'سترة صوفية ناعمة'],
            ['en' => 'Floral Party Dress', 'ku' => 'فوستانی گوڵداری ئاهەنگ', 'ar' => 'فستان زهور للحفلات'],
            ['en' => 'Denim Shorts', 'ku' => 'شۆڕتی کابۆی هاوینە', 'ar' => 'شورت جينز صيفي'],
            ['en' => 'Kids Winter Beanie & Scarf', 'ku' => 'کڵاو و ملپێچی زستانە', 'ar' => 'قبعة ووشاح شتوي'],
        ];

        $now = date('Y-m-d H:i:s');

        for ($i = 1; $i <= 1000; $i++) {
            $tpl = $productTemplates[($i - 1) % count($productTemplates)];
            $catId = $categoryIds[($i - 1) % count($categoryIds)];
            $img = $images[($i - 1) % count($images)];
            $price = round((12 + ($i % 35)) * 1000);
            $cost = round($price * 0.55);
            $barcode = '869000' . str_pad((string)$i, 6, '0', STR_PAD_LEFT);
            $gender = $i % 3;

            $productId = DB::table('products')->insertGetId([
                'category_id' => $catId,
                'name' => $tpl['en'] . " #{$i}",
                'name_ku' => $tpl['ku'] . " #{$i}",
                'name_ar' => $tpl['ar'] . " #{$i}",
                'description' => "Premium quality clothing item for children. Comfort guaranteed. Item #{$i}",
                'description_ku' => "پۆشاکی منداڵانی کوالیتی بەرز و دڵنیا لە ئاسوودەیی. بەرهەمی ژمارە #{$i}",
                'description_ar' => "ملابس أطفال عالية الجودة ومريحة للغاية. المنتج رقم #{$i}",
                'sku' => $barcode,
                'image_url' => $img,
                'price' => $price,
                'cost' => $cost,
                'gender' => $gender,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $numVars = 2 + ($i % 4);
            $variations = [];
            for ($v = 0; $v < $numVars; $v++) {
                $variations[] = [
                    'product_id' => $productId,
                    'color' => $colors[($i + $v) % count($colors)],
                    'size' => $sizes[($i + $v) % count($sizes)],
                    'stock_quantity' => (($i * 3 + $v * 7) % 45) + 5,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            DB::table('product_variations')->insert($variations);
        }
    }
}
