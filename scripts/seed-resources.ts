import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Guide {
  slug: string
  title: string
  subtitle?: string
  provinces: string[]
  tags: string[]
  resource_type: string
  category_slug: string
  featured?: boolean
  excerpt?: string
  content: any
}

interface FAQ {
  question: string
  answer: string
  category_slug: string
  provinces: string[]
  tags: string[]
}

async function seedResources() {
  console.log('Starting resource seeding...')

  // Read data files
  const guidesPath = path.join(__dirname, '../src/data/resources/guides.json')
  const faqsPath = path.join(__dirname, '../src/data/resources/faqs.json')

  const guides: Guide[] = JSON.parse(fs.readFileSync(guidesPath, 'utf-8'))
  const faqs: FAQ[] = JSON.parse(fs.readFileSync(faqsPath, 'utf-8'))

  // Get category mapping
  const { data: categories, error: catError } = await supabase
    .from('resource_categories')
    .select('id, slug')

  if (catError) {
    console.error('Error fetching categories:', catError)
    process.exit(1)
  }

  const categoryMap = new Map(categories?.map((c) => [c.slug, c.id]))

  // Seed guides
  console.log(`Seeding ${guides.length} guides...`)

  for (const guide of guides) {
    const categoryId = categoryMap.get(guide.category_slug)

    const { error } = await supabase.from('resources').upsert(
      {
        slug: guide.slug,
        title: guide.title,
        subtitle: guide.subtitle || null,
        content: guide.content,
        excerpt: guide.excerpt || null,
        provinces: guide.provinces,
        tags: guide.tags,
        resource_type: guide.resource_type,
        category_id: categoryId || null,
        featured: guide.featured || false,
        is_published: true,
        last_reviewed_at: new Date().toISOString(),
      },
      {
        onConflict: 'slug',
      }
    )

    if (error) {
      console.error(`Error seeding guide ${guide.slug}:`, error)
    } else {
      console.log(`  ✓ ${guide.title}`)
    }
  }

  // Seed FAQs
  console.log(`\nSeeding ${faqs.length} FAQs...`)

  for (let i = 0; i < faqs.length; i++) {
    const faq = faqs[i]
    const categoryId = categoryMap.get(faq.category_slug)

    const { error } = await supabase.from('faqs').insert({
      question: faq.question,
      answer: faq.answer,
      category_id: categoryId || null,
      provinces: faq.provinces,
      tags: faq.tags,
      display_order: i,
      is_published: true,
      last_reviewed_at: new Date().toISOString(),
    })

    if (error) {
      // Check if it's a duplicate (question already exists)
      if (error.code === '23505') {
        console.log(`  - Skipping duplicate: ${faq.question.substring(0, 40)}...`)
      } else {
        console.error(`Error seeding FAQ:`, error)
      }
    } else {
      console.log(`  ✓ ${faq.question.substring(0, 50)}...`)
    }
  }

  console.log('\n✅ Resource seeding complete!')
}

seedResources().catch(console.error)
