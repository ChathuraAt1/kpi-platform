<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiKey;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;

class ApiKeyController extends Controller
{
    public function index(Request $request)
    {
        // TODO: restrict to admin role via middleware
        $keys = ApiKey::orderBy('priority')->get();
        return response()->json($keys);
    }

    public function store(Request $request)
    {
        $this->authorize('manageApiKeys');
        $data = $request->validate([
            'provider' => 'required|string',
            'name' => 'required|string',
            'key' => 'required|string',
            'priority' => 'nullable|integer',
            'daily_quota' => 'nullable|integer',
        ]);

        $apiKey = ApiKey::create([
            'user_id' => $request->user()->id,
            'provider' => $data['provider'],
            'name' => $data['name'],
            'encrypted_key' => Crypt::encryptString($data['key']),
            'priority' => $data['priority'] ?? 10,
            'daily_quota' => $data['daily_quota'] ?? null,
            'status' => 'active',
        ]);

        return response()->json($apiKey, 201);
    }

    public function show($id)
    {
        $key = ApiKey::findOrFail($id);
        return response()->json($key);
    }

    public function update(Request $request, $id)
    {
        $this->authorize('manageApiKeys');
        $apiKey = ApiKey::findOrFail($id);
        $data = $request->validate([
            'name' => 'nullable|string',
            'priority' => 'nullable|integer',
            'daily_quota' => 'nullable|integer',
            'status' => 'nullable|string',
        ]);
        $apiKey->update($data);
        return response()->json($apiKey);
    }

    public function destroy($id)
    {
        $this->authorize('manageApiKeys');
        $apiKey = ApiKey::findOrFail($id);
        $apiKey->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
