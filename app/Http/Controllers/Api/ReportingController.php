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

        $users = User::all();
        $missing = [];
        foreach ($users as $u) {
            $has = TaskLog::where('user_id', $u->id)->where('date', $date)->exists();
            if (!$has) $missing[] = $u;
        }

        return response()->json(['date' => $date, 'missing' => $missing]);
    }
}
