<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ServerTimeController extends Controller
{
    /**
     * Return the current server time for trusted synchronization.
     */
    public function index()
    {
        return response()->json([
            'date' => now()->toDateString(),
            'datetime' => now()->toIso8601String(),
            'timezone' => config('app.timezone'),
        ]);
    }
}
