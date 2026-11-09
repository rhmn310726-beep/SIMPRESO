<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medicines', function (Blueprint $table) {
            $table->string('code')->nullable()->unique();
            $table->string('category')->nullable();
            $table->string('strength')->nullable();
            $table->string('storage_location')->nullable();
            $table->text('notes')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('medicines', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->dropColumn(['code', 'category', 'strength', 'storage_location', 'notes']);
        });
    }
};
