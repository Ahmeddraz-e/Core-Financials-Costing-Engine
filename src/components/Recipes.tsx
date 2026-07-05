import React, { useState } from 'react';
import { ChefHat, Plus, Trash2, Edit2, Play, Save, Settings, Info, DollarSign, Calculator, Percent } from 'lucide-react';
import { ERPData, Recipe, RecipeComponent, InventoryItem, ItemCategory } from '../types';

interface RecipesProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdateRecipes: (recipes: Recipe[]) => void;
  onAddAuditLog: (actionAr: string, actionEn: string, details: string) => void;
}

export default function Recipes({ data, lang, onUpdateRecipes, onAddAuditLog }: RecipesProps) {
  const isAr = lang === 'ar';
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(data.recipes[0] || null);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Recipe Form states
  const [selectedFinishedItemId, setSelectedFinishedItemId] = useState('');
  const [yieldAmount, setYieldAmount] = useState(1);
  const [laborCost, setLaborCost] = useState(5.0);
  const [packagingCost, setPackagingCost] = useState(1.5);
  const [otherOperatingCost, setOtherOperatingCost] = useState(1.0);
  const [sellingPrice, setSellingPrice] = useState(50.0);
  const [components, setComponents] = useState<RecipeComponent[]>([
    { componentItemId: '', quantity: 0, lossPercent: 0 }
  ]);

  // Simulation Playground states
  const [simSellingPrice, setSimSellingPrice] = useState<number>(selectedRecipe?.sellingPrice || 0);
  const [simLabor, setSimLabor] = useState<number>(selectedRecipe?.laborCost || 0);

  const getInventoryItemName = (id: string) => {
    const item = data.inventory.find(i => i.id === id);
    return item ? (isAr ? item.nameAr : item.nameEn) : 'Unknown Raw Material';
  };

  const getInventoryItemCost = (id: string) => {
    return data.inventory.find(i => i.id === id)?.cost || 0;
  };

  // ADVANCED KITCHEN COST FORMULA
  // Effective Cost = (Quantity * Raw Cost) / (1 - LossPercent / 100)
  const calculateEffectiveComponentCost = (comp: RecipeComponent) => {
    const rawCost = getInventoryItemCost(comp.componentItemId);
    const quantity = comp.quantity || 0;
    const loss = comp.lossPercent || 0;
    if (loss >= 100) return 0;
    return (quantity * rawCost) / (1 - loss / 100);
  };

  const calculateRecipeRawFoodCost = (recipeComponents: RecipeComponent[]) => {
    return recipeComponents.reduce((sum, c) => sum + calculateEffectiveComponentCost(c), 0);
  };

  // Add / Remove component row in recipe builder
  const handleAddComponentRow = () => {
    setComponents([...components, { componentItemId: '', quantity: 0, lossPercent: 0 }]);
  };

  const handleRemoveComponentRow = (idx: number) => {
    if (components.length <= 1) return;
    setComponents(components.filter((_, i) => i !== idx));
  };

  const handleComponentChange = (idx: number, field: keyof RecipeComponent, value: string | number) => {
    const newComps = [...components];
    if (field === 'componentItemId') {
      newComps[idx].componentItemId = String(value);
    } else {
      newComps[idx][field] = Number(value) || 0;
    }
    setComponents(newComps);
  };

  const handleSaveRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFinishedItemId || components.some(c => !c.componentItemId)) return;

    const rawFoodCost = calculateRecipeRawFoodCost(components);
    const calculatedCost = rawFoodCost + Number(laborCost) + Number(packagingCost) + Number(otherOperatingCost);
    const margin = Number(sellingPrice) - calculatedCost;
    const marginPercent = Number(sellingPrice) > 0 ? (margin / Number(sellingPrice)) * 100 : 0;
    const foodCostPercent = Number(sellingPrice) > 0 ? (calculatedCost / Number(sellingPrice)) * 100 : 0;

    const newRecipe: Recipe = {
      id: 'rec-' + Math.random().toString(36).substring(2, 9),
      itemId: selectedFinishedItemId,
      yieldAmount: Number(yieldAmount) || 1,
      components,
      laborCost: Number(laborCost) || 0,
      packagingCost: Number(packagingCost) || 0,
      otherOperatingCost: Number(otherOperatingCost) || 0,
      calculatedCost,
      sellingPrice: Number(sellingPrice) || 0,
      marginPercent,
      foodCostPercent
    };

    const updatedRecipes = [...data.recipes, newRecipe];
    onUpdateRecipes(updatedRecipes);
    setSelectedRecipe(newRecipe);

    // Sync simulation playground to new recipe
    setSimSellingPrice(newRecipe.sellingPrice);
    setSimLabor(newRecipe.laborCost);

    const finishedItemName = getInventoryItemName(selectedFinishedItemId);
    onAddAuditLog(
      `إنشاء بطاقة تكلفة لـ: ${finishedItemName}`,
      `Created Recipe Costing: ${finishedItemName}`,
      `تم احتساب تكلفة الوجبة بـ ${calculatedCost} جنيه وتعيين سعر بيع ${sellingPrice} جنيه.`
    );

    // Reset Form
    setSelectedFinishedItemId('');
    setYieldAmount(1);
    setLaborCost(5.0);
    setPackagingCost(1.5);
    setOtherOperatingCost(1.0);
    setSellingPrice(50.0);
    setComponents([{ componentItemId: '', quantity: 0, lossPercent: 0 }]);
    setShowAddForm(false);
  };

  // DYNAMIC SIMULATOR PLAYGROUND CALCULATIONS
  const currentRecipeRawCost = selectedRecipe ? calculateRecipeRawFoodCost(selectedRecipe.components) : 0;
  const simCalculatedCost = currentRecipeRawCost + Number(simLabor) + (selectedRecipe?.packagingCost || 0) + (selectedRecipe?.otherOperatingCost || 0);
  const simMargin = Number(simSellingPrice) - simCalculatedCost;
  const simMarginPercent = Number(simSellingPrice) > 0 ? (simMargin / Number(simSellingPrice)) * 100 : 0;
  const simFoodCostPercent = Number(simSellingPrice) > 0 ? (simCalculatedCost / Number(simSellingPrice)) * 100 : 0;
  const simContributionMargin = Number(simSellingPrice) - currentRecipeRawCost; // Selling Price - raw food cost

  return (
    <div id="recipes_costing_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ChefHat className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'نظام الوصفات وهندسة التكاليف (Food Costing)' : 'Standard Recipes & Food Costing Engineering'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'حساب نسبة التصافي والهدر للمواد الأولية، تجميع التكاليف المباشرة والتشغيلية، وتحليل هامش المساهمة الفردي للوجبات' : 'Calculate yield rates and kitchen wastage, group labor and overheads, and simulate product contribution margins'}
          </p>
        </div>
        
        <button
          id="toggle_recipe_form_btn"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-500/15"
        >
          <Plus className="h-4 w-4" />
          <span>{isAr ? 'إنشاء بطاقة تكلفة وجبة جديدة' : 'Build New Recipe Cost Card'}</span>
        </button>
      </div>

      {/* NEW RECIPE FORM PANEL */}
      {showAddForm && (
        <div id="new_recipe_panel" className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Calculator className="h-5 w-5 text-blue-600" />
            {isAr ? 'تسجيل بطاقة تكلفة معيارية جديدة' : 'Standard Cost Recipe Architect'}
          </h3>

          <form onSubmit={handleSaveRecipe} className="space-y-5">
            {/* Finished Item Selector & yields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'الوجبة أو المنتج النهائي المستهدف' : 'Target Finished Menu Item'}</label>
                <select
                  id="recipe_finished_item"
                  required
                  value={selectedFinishedItemId}
                  onChange={(e) => setSelectedFinishedItemId(e.target.value)}
                  className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none"
                >
                  <option value="">{isAr ? '-- اختر المنتج النهائي الجاهز --' : '-- Select finished product --'}</option>
                  {data.inventory
                    .filter(i => i.category === ItemCategory.FinishedProduct)
                    .map(i => (
                      <option key={i.id} value={i.id}>{i.code} - {isAr ? i.nameAr : i.nameEn}</option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'سعر البيع المقترح للمستهلك' : 'Proposed Retail Price'}</label>
                <input
                  id="recipe_selling_price"
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'كمية الإنتاج (Yield Amount)' : 'Yield Amount Output'}</label>
                <input
                  id="recipe_yield_amount"
                  type="number"
                  required
                  min="1"
                  value={yieldAmount}
                  onChange={(e) => setYieldAmount(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Direct & Indirect Costs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'تكلفة العمالة المباشرة للتحضير' : 'Direct Kitchen Labor'}</label>
                <input
                  id="recipe_labor_cost"
                  type="number"
                  step="any"
                  value={laborCost}
                  onChange={(e) => setLaborCost(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'تكلفة مواد التعبئة والتغليف' : 'Direct Packaging Cost'}</label>
                <input
                  id="recipe_packaging_cost"
                  type="number"
                  step="any"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'المصروفات التشغيلية والغاز' : 'Operational Overhead'}</label>
                <input
                  id="recipe_overhead_cost"
                  type="number"
                  step="any"
                  value={otherOperatingCost}
                  onChange={(e) => setOtherOperatingCost(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Ingredients builder */}
            <div className="space-y-3">
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                {isAr ? 'المكونات الغذائية ومعدلات الهدر' : 'Ingredient Specs & Loss Percentages'}
              </span>

              <div className="space-y-2">
                {components.map((comp, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    
                    {/* Raw Material Select */}
                    <div className="md:col-span-6">
                      <select
                        id={`recipe_comp_item_${idx}`}
                        required
                        value={comp.componentItemId}
                        onChange={(e) => handleComponentChange(idx, 'componentItemId', e.target.value)}
                        className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
                      >
                        <option value="">{isAr ? '-- اختر خامة المطبخ المكونة --' : '-- Choose Raw Ingredient --'}</option>
                        {data.inventory
                          .filter(i => i.category !== ItemCategory.FinishedProduct)
                          .map(i => (
                            <option key={i.id} value={i.id}>
                              {isAr ? i.nameAr : i.nameEn} ({isAr ? `التكلفة: ${i.cost} ج.م / ${i.unitAr}` : `Cost: ${i.cost} EGP / ${i.unitEn}`})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Weight/Quantity */}
                    <div className="md:col-span-2">
                      <input
                        id={`recipe_comp_qty_${idx}`}
                        type="number"
                        step="any"
                        required
                        min="0.001"
                        placeholder={isAr ? 'الكمية/الوزن' : 'Quantity'}
                        value={comp.quantity || ''}
                        onChange={(e) => handleComponentChange(idx, 'quantity', e.target.value)}
                        className="w-full text-xs font-mono font-bold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
                      />
                    </div>

                    {/* Cooking loss % */}
                    <div className="md:col-span-2">
                      <div className="relative">
                        <input
                          id={`recipe_comp_loss_${idx}`}
                          type="number"
                          min="0"
                          max="95"
                          placeholder={isAr ? 'هدر %' : 'Loss %'}
                          value={comp.lossPercent || ''}
                          onChange={(e) => handleComponentChange(idx, 'lossPercent', e.target.value)}
                          className="w-full text-xs font-mono font-bold py-2.5 px-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
                        />
                        <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-bold text-slate-400 font-mono">%</span>
                      </div>
                    </div>

                    {/* Remove button */}
                    <div className="md:col-span-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveComponentRow(idx)}
                        disabled={components.length <= 1}
                        className="p-2 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>

              <button
                id="recipe_add_row_btn"
                type="button"
                onClick={handleAddComponentRow}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer mt-2"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'إدراج مادة خام أخرى للوجبة' : 'Add Another Ingredient Component'}</span>
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                id="recipe_cancel_btn"
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                {isAr ? 'إلغاء التراجع' : 'Cancel'}
              </button>
              <button
                id="recipe_submit_btn"
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md"
              >
                {isAr ? 'حساب وحفظ بطاقة التكلفة للمنتج' : 'Compile & Save Cost Card'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* CORE SPLIT SCREEN - RECIPES LIST VS VIEW & SIMULATOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recipes Side Bar (List of active costing cards) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
            {isAr ? 'البطاقات المعيارية النشطة للوجبات' : 'Active Costing Ledger Cards'}
          </span>

          <div className="space-y-2">
            {data.recipes.map((rec) => {
              const finishedName = getInventoryItemName(rec.itemId);
              const isActive = selectedRecipe?.id === rec.id;
              return (
                <button
                  key={rec.id}
                  id={`recipe_list_item_${rec.id}`}
                  onClick={() => {
                    setSelectedRecipe(rec);
                    setSimSellingPrice(rec.sellingPrice);
                    setSimLabor(rec.laborCost);
                  }}
                  className={`w-full text-start p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                    isActive 
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/10 font-bold' 
                      : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100/50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">{finishedName}</p>
                    <span className={`text-[10px] block mt-0.5 ${isActive ? 'text-blue-200' : 'text-slate-400 font-bold'}`}>
                      {isAr ? 'التكلفة:' : 'Cost:'} {rec.calculatedCost.toFixed(2)} ج.م
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-950 text-blue-600'}`}>
                    {rec.foodCostPercent.toFixed(1)}% FC
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recipe detail, Ingredients table, and CFO Play Ground */}
        <div className="lg:col-span-8 space-y-6">
          
          {selectedRecipe ? (
            <>
              {/* Detailed recipe specifications */}
              <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs space-y-4">
                
                {/* Header detail */}
                <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {getInventoryItemName(selectedRecipe.itemId)}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block mt-1">
                      {isAr ? 'البطاقة المعيارية رقم:' : 'Recipe ID:'} {selectedRecipe.id} • Yield Amount: {selectedRecipe.yieldAmount}
                    </span>
                  </div>

                  <div className="text-end">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tight block">{isAr ? 'سعر البيع المعتمد' : 'Retail Price'}</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{selectedRecipe.sellingPrice.toFixed(2)} ج.م</span>
                  </div>
                </div>

                {/* Sub-costs blocks */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'تكلفة خامات الطعام' : 'Raw Food Cost'}</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono mt-1 block">
                      {calculateRecipeRawFoodCost(selectedRecipe.components).toFixed(2)} ج.م
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'تكلفة الأيدي العاملة' : 'Direct Kitchen Labor'}</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono mt-1 block">{selectedRecipe.laborCost.toFixed(2)} ج.م</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'تعبئة وتغليف الوجبة' : 'Packaging Overhead'}</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono mt-1 block">{selectedRecipe.packagingCost.toFixed(2)} ج.م</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'إجمالي التكلفة الإجمالية' : 'Total Compiled Cost'}</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono mt-1 block text-rose-600">{selectedRecipe.calculatedCost.toFixed(2)} ج.م</span>
                  </div>
                </div>

                {/* Ingredients specs list */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    {isAr ? 'المكونات وتأثير معامل الهدر للطهي والتحضير' : 'Component Raw materials & effective cost multipliers'}
                  </span>
                  
                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden text-[11px] font-semibold">
                    <div className="grid grid-cols-12 bg-slate-50 dark:bg-slate-900 p-2 border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <div className="col-span-5 text-start">{isAr ? 'المادة الخام المستهلكة' : 'Raw Ingredient'}</div>
                      <div className="col-span-2 text-end">{isAr ? 'سعر الكيلو/الوحدة' : 'Unit Cost'}</div>
                      <div className="col-span-2 text-end">{isAr ? 'الكمية المطلوبة' : 'Qty Needed'}</div>
                      <div className="col-span-1 text-center">{isAr ? 'الهدر %' : 'Loss %'}</div>
                      <div className="col-span-2 text-end">{isAr ? 'التكلفة الفعلية' : 'Effective Cost'}</div>
                    </div>

                    <div className="divide-y divide-slate-50 dark:divide-slate-800/40">
                      {selectedRecipe.components.map((comp, cIdx) => {
                        const rawCost = getInventoryItemCost(comp.componentItemId);
                        const effectiveCost = calculateEffectiveComponentCost(comp);
                        return (
                          <div key={cIdx} className="grid grid-cols-12 p-2 items-center text-slate-700 dark:text-slate-300">
                            <div className="col-span-5 text-start text-slate-800 dark:text-slate-200 font-bold">{getInventoryItemName(comp.componentItemId)}</div>
                            <div className="col-span-2 text-end font-mono">{rawCost.toFixed(2)} ج.م</div>
                            <div className="col-span-2 text-end font-mono">{comp.quantity}</div>
                            <div className="col-span-1 text-center font-mono text-rose-500">{comp.lossPercent}%</div>
                            <div className="col-span-2 text-end font-mono font-bold text-slate-900 dark:text-white">{effectiveCost.toFixed(2)} ج.م</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>

              {/* DYNAMIC CFO PLAYGROUND / MARGINS SIMULATOR */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <Calculator className="h-5 w-5 text-sky-400" />
                  <div>
                    <h4 className="text-xs font-extrabold text-sky-400 uppercase tracking-wider">{isAr ? 'محاكي هوامش الأرباح التفاعلي للمدير المالي' : 'CFO Profit Margins Interactive Simulator'}</h4>
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'حرك قيم المدخلات والأسعار لمعاينة الأرباح ونسب الهدر مباشرة' : 'Adjust retail prices and preparation wages to observe profitability fluctuations live'}</span>
                  </div>
                </div>

                {/* Input Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Selling price simulator */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">{isAr ? 'محاكاة سعر البيع الجديد' : 'Simulate New Selling Price'}</span>
                      <span className="text-sky-400 font-mono font-bold">{simSellingPrice.toFixed(0)} ج.م</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      value={simSellingPrice}
                      onChange={(e) => setSimSellingPrice(Number(e.target.value))}
                      className="w-full accent-sky-400 cursor-pointer h-1 rounded-full bg-slate-800"
                    />
                  </div>

                  {/* Preparation Wage simulator */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">{isAr ? 'تكلفة العمالة والتحضير المباشر' : 'Adjust Preparation Labor Wage'}</span>
                      <span className="text-sky-400 font-mono font-bold">{simLabor.toFixed(1)} ج.م</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="0.5"
                      value={simLabor}
                      onChange={(e) => setSimLabor(Number(e.target.value))}
                      className="w-full accent-sky-400 cursor-pointer h-1 rounded-full bg-slate-800"
                    />
                  </div>

                </div>

                {/* Output simulated KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800 text-center font-semibold">
                  <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block font-bold">{isAr ? 'إجمالي التكلفة بالمحاكاة' : 'Simulated Unit Cost'}</span>
                    <span className="text-sm font-black text-slate-200 mt-1 block font-mono">{simCalculatedCost.toFixed(2)} ج.م</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block font-bold">{isAr ? 'نسبة تكلفة الطعام (Food Cost)' : 'Food Cost %'}</span>
                    <span className={`text-sm font-black mt-1 block font-mono ${
                      simFoodCostPercent > 35 ? 'text-rose-500' : simFoodCostPercent > 30 ? 'text-amber-500' : 'text-emerald-500'
                    }`}>{simFoodCostPercent.toFixed(1)}%</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block font-bold">{isAr ? 'هامش الربح الإجمالي' : 'Gross Profit Margin'}</span>
                    <span className="text-sm font-black text-emerald-400 mt-1 block font-mono">{simMarginPercent.toFixed(1)}%</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block font-bold">{isAr ? 'هامش المساهمة (CM)' : 'Contribution Margin'}</span>
                    <span className="text-sm font-black text-sky-400 mt-1 block font-mono">{simContributionMargin.toFixed(2)} ج.م</span>
                  </div>
                </div>

                {/* Cost advice notice */}
                <div className="p-3 bg-slate-950/20 border border-slate-800 text-[10px] text-slate-400 font-bold leading-relaxed">
                  <span className="text-sky-400 block mb-0.5">💡 {isAr ? 'توجيه هندسة الأسعار لـ CFO:' : 'CFO Pricing Strategy Tip:'}</span>
                  {isAr 
                    ? 'لضمان أداء ربحي ممتاز، حاول إبقاء نسبة تكلفة الطعام (Food Cost %) في حدود 28% إلى 32%. إذا تجاوزت هذه النسبة، يوصى بمراجعة موردي اللحوم لتخفيض تكلفة الشراء، أو رفع سعر الوجبة بنسبة 5%.'
                    : 'To secure optimum profits, keep the Food Cost % between 28% and 32%. If simulation values spike, consider renegotiating purchasing pipelines or implementing a 5% retail pricing adjustment.'}
                </div>

              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-950 p-12 text-center rounded-2xl border text-slate-400 dark:text-slate-500">
              {isAr ? 'الرجاء اختيار وجبة من القائمة الجانبية لعرض تفاصيل التكلفة.' : 'Select a menu item from the sidebar to visualize recipe costing components.'}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
