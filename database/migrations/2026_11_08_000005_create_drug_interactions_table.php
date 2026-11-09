<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('drug_interactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medicine_a_id')->constrained('medicines')->cascadeOnDelete();
            $table->foreignId('medicine_b_id')->constrained('medicines')->cascadeOnDelete();
            $table->string('severity')->default('ringan');
            $table->text('recommendation');
            $table->timestamps();

            $table->unique(['medicine_a_id', 'medicine_b_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drug_interactions');
    }
};
