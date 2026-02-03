<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GlobalSetting;
use Illuminate\Http\Request;

class GlobalSettingController extends Controller
{
    public function index()
    {
        $this->authorize('manageUsers'); // Assume admin role for now
        return response()->json(GlobalSetting::all());
    }

    public function update(Request $request, $key)
    {
        $this->authorize('manageUsers');
        
        $data = $request->validate([
            'value' => 'required',
            'description' => 'nullable|string',
        ]);

        $setting = GlobalSetting::where('key', $key)->firstOrFail();
        $setting->update($data);

        return response()->json($setting);
    }
}
