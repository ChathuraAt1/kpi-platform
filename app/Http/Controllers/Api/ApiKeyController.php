<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiKey;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use App\Http\Requests\StoreApiKeyRequest;
use App\Http\Requests\UpdateApiKeyRequest;

class ApiKeyController extends Controller
{
    public function index(Request $request)
    {
        // TODO: restrict to admin role via middleware
        $keys = ApiKey::orderBy('priority')->get();
        return response()->json($keys);
    }

    public function store(StoreApiKeyRequest $request)
    {
        $data = $request->validated();

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

    public function update(UpdateApiKeyRequest $request, $id)
    {
        $this->authorize('manageApiKeys');
        $apiKey = ApiKey::findOrFail($id);
        $apiKey->update($request->validated());
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
