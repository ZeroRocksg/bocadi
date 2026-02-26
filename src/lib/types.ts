export type WorkspaceRole = 'owner' | 'member'
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
export type MealSlotKey = 'breakfast' | 'lunch' | 'dinner' // legacy text field

export interface MealSlot {
  id: string
  workspace_id: string
  name: string
  sort_order: number
  is_default: boolean
  created_at: string
}

export interface Workspace {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export interface WorkspaceMember {
  workspace_id: string
  user_id: string
  role: WorkspaceRole
}

export interface ProteinType {
  id: string
  workspace_id: string
  name: string
  color: string // hex: #F5A623
  created_at: string
}

export interface Dish {
  id: string
  workspace_id: string
  protein_type_id: string | null
  name: string
  description: string | null
  image_url: string | null
  created_at: string
  // Relaciones opcionales (joins)
  protein_type?: ProteinType
  ingredients?: Ingredient[]
}

export interface Ingredient {
  id: string
  dish_id: string
  name: string
  quantity: number | null
  unit: string | null
  estimated_cost: number
  estimated_kcal: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  fiber_g?: number
  sodium_mg?: number
  vitamin_c_mg?: number
  vitamin_d_ui?: number
  calcium_mg?: number
  iron_mg?: number
  potassium_mg?: number
  created_at: string
}

export interface WeekPlanEntry {
  id: string
  workspace_id: string
  dish_id: string
  week_start: string // ISO date: YYYY-MM-DD (lunes de la semana)
  day_of_week: DayOfWeek
  meal_slot: MealSlotKey  // legacy
  meal_slot_id: string | null  // nuevo (UUID de meal_slots)
  created_at: string
  // Relación opcional
  dish?: Dish
}

// Tipo para el formulario de plato
export interface DishFormData {
  name: string
  description: string
  protein_type_id: string
  ingredients: IngredientFormData[]
}

export interface IngredientFormData {
  id?: string
  name: string
  quantity: number | null
  unit: string
  estimated_cost: number
  estimated_kcal: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  fiber_g?: number
  sodium_mg?: number
  vitamin_c_mg?: number
  vitamin_d_ui?: number
  calcium_mg?: number
  iron_mg?: number
  potassium_mg?: number
}
