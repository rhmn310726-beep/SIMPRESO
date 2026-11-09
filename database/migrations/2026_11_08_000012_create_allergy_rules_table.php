<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('allergy_rules', function (Blueprint $table) {
            $table->id();
            $table->string('active_ingredient')->unique();
            $table->string('drug_group')->nullable();
            $table->string('allergen_name');
            $table->string('severity')->default('sedang');
            $table->json('example_medicines')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('allergy_rules');
    }
};
