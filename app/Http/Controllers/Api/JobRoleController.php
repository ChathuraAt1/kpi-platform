<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class JobRoleController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('can:manageJobRoles', only: ['store', 'update', 'destroy']),
        ];
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(\App\Models\JobRole::with('kpiCategories')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|unique:job_roles,name',
            'description' => 'nullable|string',
            'kpis' => 'array',
            'kpis.*.id' => 'exists:kpi_categories,id',
            'kpis.*.weight' => 'integer|min:0|max:100'
        ]);

        $role = \App\Models\JobRole::create([
            'name' => $data['name'],
            'description' => $data['description']
        ]);

        if (!empty($data['kpis'])) {
            $syncData = [];
            foreach ($data['kpis'] as $kpi) {
                $syncData[$kpi['id']] = ['weight' => $kpi['weight']];
            }
            $role->kpiCategories()->sync($syncData);
        }

        return response()->json($role->load('kpiCategories'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return response()->json(\App\Models\JobRole::with('kpiCategories')->findOrFail($id));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $role = \App\Models\JobRole::findOrFail($id);
        $data = $request->validate([
            'name' => 'required|string|unique:job_roles,name,' . $role->id,
            'description' => 'nullable|string',
            'kpis' => 'array',
            'kpis.*.id' => 'exists:kpi_categories,id',
            'kpis.*.weight' => 'integer|min:0|max:100'
        ]);

        $role->update([
            'name' => $data['name'],
            'description' => $data['description']
        ]);

        if (isset($data['kpis'])) {
            $syncData = [];
            foreach ($data['kpis'] as $kpi) {
                $syncData[$kpi['id']] = ['weight' => $kpi['weight']];
            }
            $role->kpiCategories()->sync($syncData);
        }

        return response()->json($role->load('kpiCategories'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $role = \App\Models\JobRole::findOrFail($id);
        $role->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
