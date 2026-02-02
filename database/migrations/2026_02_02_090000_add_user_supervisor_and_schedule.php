<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('employee')->after('password');
            $table->unsignedBigInteger('supervisor_id')->nullable()->after('role');
            $table->time('work_start_time')->nullable()->after('supervisor_id');
            $table->time('work_end_time')->nullable()->after('work_start_time');
            $table->json('breaks')->nullable()->after('work_end_time');
            $table->string('timezone')->default('UTC')->after('breaks');

            $table->foreign('supervisor_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['supervisor_id']);
            $table->dropColumn(['role', 'supervisor_id', 'work_start_time', 'work_end_time', 'breaks', 'timezone']);
        });
    }
};
