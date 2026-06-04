"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '../../../../lib/api';
import { useAuth } from '../../../../components/AuthProvider';
import Link from 'next/link';
import { ArrowLeft, Plus, Box, Calendar, ArrowRight, X, LayoutGrid, Network } from 'lucide-react';
import ProjectGraph from '../../../../components/ProjectGraph';

export default function ProjectPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('graph');

  // Edit Module State
  const [isEditing, setIsEditing] = useState(false);
  const [editModuleId, setEditModuleId] = useState('');
  const [editModuleTitle, setEditModuleTitle] = useState('');
  const [editModuleDate, setEditModuleDate] = useState('');

  // Delete Module State
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModuleId, setDeleteModuleId] = useState('');

  const openEditModal = (mod: any) => {
    setEditModuleId(mod.id);
    setEditModuleTitle(mod.title);
    setEditModuleDate(mod.expectedCompletionDate ? new Date(mod.expectedCompletionDate).toISOString().substring(0, 10) : '');
    setIsEditing(true);
  };

  const handleEditModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModuleTitle.trim()) return;

    try {
      await api.put(`/modules/${editModuleId}`, {
        title: editModuleTitle,
        expectedCompletionDate: editModuleDate ? new Date(editModuleDate) : null,
      });
      setIsEditing(false);
      fetchData();
    } catch (err) {
      alert('Failed to edit module');
    }
  };

  const openDeleteModal = (moduleId: string) => {
    setDeleteModuleId(moduleId);
    setIsDeleting(true);
  };

  const handleDeleteModule = async () => {
    try {
      await api.delete(`/modules/${deleteModuleId}`);
      setIsDeleting(false);
      fetchData();
    } catch (err) {
      alert('Failed to delete module');
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [projectRes, modulesRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/modules/project/${id}`)
      ]);
      setProject(projectRes.data);
      setModules(modulesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;
    
    try {
      const response = await api.post('/modules', {
        projectId: id,
        ownerId: user?.id,
        title: newModuleTitle,
        status: 'IN_PROGRESS'
      });
      // The API returns owner as just ID during create, so we manually shape the object for the UI
      const newMod = { 
        ...response.data.data, 
        owner: { name: user?.name }
      };
      setModules([...modules, newMod]);
      setIsCreating(false);
      setNewModuleTitle('');
    } catch (err) {
      alert('Failed to create module');
    }
  };

  if (loading) return <div>Loading project details...</div>;
  if (!project) return <div>Project not found</div>;

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
          <p className="text-slate-500 mt-1 flex items-center">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${project.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
            {project.status} Project
          </p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Module
          </button>
        )}
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add New Module</h3>
              <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateModule}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Module Title</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Database Schema Setup"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="font-semibold text-slate-800 flex items-center">
              <Box className="w-4 h-4 mr-2 text-slate-500" />
              Project Modules
            </h2>
            <div className="flex bg-slate-200 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('graph')}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'graph' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Network className="w-4 h-4 mr-1.5" />
                Graph
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <LayoutGrid className="w-4 h-4 mr-1.5" />
                List
              </button>
            </div>
          </div>
          <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            {modules.length} Modules
          </span>
        </div>
        
        {viewMode === 'graph' ? (
          <div className="p-6">
            <ProjectGraph projectId={id as string} />
          </div>
        ) : (
          modules.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No modules have been created for this project yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
            {modules.map((module) => (
              <div key={module.id} className="p-6 hover:bg-slate-50 transition-colors group flex items-center justify-between">
                <div>
                  <Link href={`/dashboard/modules/${module.id}`}>
                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors mb-1">
                      {module.title}
                    </h3>
                  </Link>
                  <div className="flex items-center text-sm text-slate-500 space-x-4">
                    <span className="flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                        module.status === 'COMPLETED' ? 'bg-green-500' : 
                        module.status === 'PENDING_HANDSHAKE' ? 'bg-amber-500' : 'bg-blue-500'
                      }`}></span>
                      {module.status.replace('_', ' ')}
                    </span>
                    {module.expectedCompletionDate && (
                      <span className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        {new Date(module.expectedCompletionDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="text-sm text-slate-500 mr-6 text-right">
                    <p className="font-medium text-slate-700">{module.owner?.name}</p>
                    <p className="text-xs">Owner</p>
                  </div>
                  {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                    <div className="flex space-x-2 mr-4">
                      <button 
                        onClick={() => openEditModal(module)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => openDeleteModal(module.id)}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                  <Link href={`/dashboard/modules/${module.id}`}>
                    <button className="text-slate-400 group-hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors">
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          )
        )}
      </div>

      {/* Edit Module Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Edit Module</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditModule}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Module Title</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editModuleTitle}
                  onChange={(e) => setEditModuleTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected Completion Date</label>
                <input
                  type="date"
                  value={editModuleDate}
                  onChange={(e) => setEditModuleDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Module Modal */}
      {isDeleting && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Module?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete this module? This will also remove any related dependencies and handshakes. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setIsDeleting(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleDeleteModule}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
