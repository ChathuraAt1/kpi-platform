<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\TaskLog;

class ReportingController extends Controller
{
    public function missingSubmissions(Request $request)
    {
        $date = $request->query('date', now()->toDateString());

        // Consider only employees / regular users for missing submissions
        $users = User::where(function ($q) {
            $q->whereNull('role')->orWhere('role', 'employee');
        })->get();

        $missing = [];
        foreach ($users as $u) {
            $has = TaskLog::where('user_id', $u->id)->whereDate('date', $date)->exists();
            if (!$has) $missing[] = $u;
        }

        return response()->json(['date' => $date, 'missing' => $missing]);
    }
}
