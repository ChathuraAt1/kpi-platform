<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\KpiCategory;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Routing\Controllers\HasMiddleware;

class KpiCategoryController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('can:manageKpiCategories', only: ['store', 'update', 'destroy']),
        ];
    }

    public function index()
    {
        return response()->json(KpiCategory::all());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|unique:kpi_categories,name',
            'description' => 'nullable|string',
            'weight' => 'nullable|numeric|min:0|max:10'
        ]);
        $cat = KpiCategory::create($data);
        return response()->json($cat, 201);
    }

    public function show($id)
    {
        return response()->json(KpiCategory::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $cat = KpiCategory::findOrFail($id);
        $data = $request->validate([
            'name' => 'required|string|unique:kpi_categories,name,' . $cat->id,
            'description' => 'nullable|string',
            'weight' => 'nullable|numeric|min:0|max:10'
        ]);
        $cat->update($data);
        return response()->json($cat);
    }

    public function destroy($id)
    {
        $cat = KpiCategory::findOrFail($id);
        $cat->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
