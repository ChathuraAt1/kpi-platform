<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('global_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value');
            $table->string('description')->nullable();
            $table->timestamps();
        });

        // Seed initial defaults based on user description
        $defaults = [
            'weekday_shift' => ['start' => '08:30', 'end' => '17:30'],
            'saturday_shift' => ['start' => '08:30', 'end' => '13:30'],
            'weekday_breaks' => [
                ['start' => '10:30', 'end' => '10:50', 'label' => 'Break 1'],
                ['start' => '13:00', 'end' => '14:00', 'label' => 'Lunch Break'],
                ['start' => '16:00', 'end' => '16:20', 'label' => 'Break 2'],
            ],
            'saturday_breaks' => [
                ['start' => '10:30', 'end' => '10:50', 'label' => 'Break 1'],
            ],
            'log_deadline' => '23:00',
        ];

        foreach ($defaults as $key => $value) {
            DB::table('global_settings')->insert([
                'key' => $key,
                'value' => json_encode($value),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('global_settings');
    }
};
